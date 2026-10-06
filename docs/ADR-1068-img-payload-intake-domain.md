# ADR-1068: Image payload intake stays inside the dataUrl model domain

## Status

Accepted — round817, v1.8.091.

## Context

`validShape`'s wire contract requires `dataUrl` to match `/^data:image\//`
(and ≤16M chars). Anything else — `http(s):`, protocol-relative, other
`data:` types — is *model-illegal*: a shape carrying it can never converge,
because every peer's wire gate rejects the op that carries it.

The audit of every path that produces or moves a `dataUrl`-class payload
found three sites that manufactured model-illegal values out of honest
inputs:

| Site | What it did | Effect |
|---|---|---|
| drawio importer (`sty.shape==='image'`) | `image=` regex accepted `(data:image/…\|https?://…)` and assigned the match to `s.dataUrl` | imported image cells landed an `https:` URL in `dataUrl` → the `add` op is `validShape`-rejected on every peer → silent divergence (local has the shape, peers never see it) |
| `_imgSlim` | slimmed ANY `dataUrl` longer than 128 chars into an `img:` ref + blob-store put | an `https:` URL got registered as a "blob" under its own content key; `imgq` answered it and receivers installed `dataUrl='https://…'` — propagating the model-illegal value into every peer's blob store and shape |
| img chunk intake (`Net._onRecv` 'img') | verified only `_imgHash(data)===key` — not the payload's format | a hash-matched non-image blob (forged or inherited from the `_imgSlim` hole) was admitted into `_imgIn` and could materialize into `dataUrl` — a value `validShape` can never carry |

Local ingest (`_imgImportFile`), the canvas renderer, minimap, exporters,
and the SVG/.excalidraw importers were all already clean — the bug was
confined to the drawio regex and the two wire-side intake/slimming gates.

## Decision

1. **drawio importer**: the `image=` match is now `data:image/…;base64,…`
   only. Byte-less image cells still produce an `image` shape (a legal
   placeholder — `Shape.make('image')` doesn't require `dataUrl`), never a
   rect degrade and never an `https:` URL in `dataUrl`.

2. **`_imgSlim`**: slims only when `dataUrl` starts with `data:image/` —
   a non-image dataUrl passes through untouched instead of being hashed
   into the blob store, so junk can never become imgq-answerable.

3. **img chunk intake**: `_imgHash` match AND `_sw(data,'data:image/')` —
   hash-matched but non-image payloads stay parked (honest "not arrived")
   instead of entering `_imgIn`.

## Consequences

- The `https:`-as-`dataUrl` chain is closed at all three links: producers
  can't mint it, the slim gate won't smuggle it, and intake rejects it.
- Non-image `dataUrl` values now fail honestly: the shape keeps its
  (invalid) prop locally and the op is rejected by peers — the same
  observable outcome `validShape` already prescribes, with no silent
  divergence amplification through the blob machinery.
- Byte-less drawio image cells produce placeholders that converge
  (img `validShape` passes; render draws the missing-image box).

## Tests

7 asserts in `test.mjs` (`ADR-1068 image payload intake domain`):
`_imgSlim` refuses an `https:` dataUrl (shape keeps prop, no puts), a
hash-matched non-image blob is rejected at intake while a real image blob
lands, an image dataUrl still slims to a ref, and the three source-site
pins hold.
