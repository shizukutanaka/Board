# ADR-1033: `:`-chained img keys are per-store ordinals — '@'-mark foreign refs at persist

## Status

Accepted (v1.8.059).

## Context

`img` refs name a blob in the `imgs` store: base key `k = _imgHash(dataUrl)`
is content-faithful — the same `k` names the same bytes in every store.
Collision chaining appends per-store ordinals `k:1`, `k:2`, … via
`_imgNextKey` while the stored value differs.

A shape can carry a *foreign* parked ref: a peer's `img:k:N` arrives on the
wire, stays parked (`_imgPending` entry waiting for the blob), and is then
persisted verbatim by `Persist.save` / `saveBackup` (`_imgSlim` pass-through
for shapes with `img` and no `dataUrl`).

**Defect.** On reload, `_imgAttach` resolves `img:k:N` against the *local*
store. `:N` is a per-store ordinal, not a content address — the local `k:N`
occupant can be a different image (the local owner of base `k` chained to
`:N` for its own collision). The shape then silently restores with the wrong
image; imgq never fires because the ref "resolved". Base `k` keys are safe
(content-faithful modulo a 32-bit hash collision) — only chained ordinals
are store-relative.

## Decision

`_imgSlim(shapes, stored, fmark)` gains a mark parameter: the two persist
callers (`save`, `saveBackup`) pass `fmark=1`; wire paths (`_slimShapes`)
omit it. When `fmark` is set, a parked ref matching `/:\d+$/` is persisted as
`'@' + img`.

`_imgAttach` strips the mark: an `@`-prefixed `img` stays a parked ref
(`img:'k:N'`, no `dataUrl`) and heals via imgq against the producing wire
keyspace — never resolved from the local store.

Base-hash refs (`img:k`, no `:N`) stay unmarked and keep resolving locally.

## Why not the alternatives

- **Persist a provenance flag / per-shape keyspace tag** — more bytes and a
  new field across the whole record, for the same effect as one char.
- **Resolve through `_imgIn`/`_imgSent` (wire stores) only** — wrong domain:
  IDB blob records are the local store; the foreign blob legitimately lands
  in `_imgIn` once imgq answers it, and the parked-ref drain paths already
  reattach from there.
- **Content-address ordinals** (re-hash at chain time) — changes the wire
  keyspace; every peer must derive the same ordinal mapping.

## Invariants the mark preserves

- `@` exists only in persisted records — `_imgAttach` strips it before
  shapes become live, so wire forwards (`_slimShapes` pass-through),
  `_oa`/`_pcR` reparks, imgq keys, and parked-drain guards
  (`sh.img === msg.key`) all see the plain `k:N` ref.
- A live `img:k:N` is foreign by construction (local attach removes `img` on
  success), so re-marking on the next save is correct — no flip-flopping.
- Old versions loading an `@k:N` record park a ref that imgq never answers —
  same benign degradation as a blob that never arrives; no corruption.

## Residuals

- Honest-peer FNV collision on the *base* key is cryptographically-negligible
  and unmarked by design (the store dedups identical content under `k`); a
  crafted collision grants a hostile peer nothing beyond sending arbitrary
  images directly, which the threat model already accepts.
- `checkBackup`'s `validShape` filter tolerates `@`-marked `img` (the prop
  carries no format gate).

## Pins (test.mjs)

- Persist marks a `/:\d+$/` foreign ref `'@'+img`, base `k` stays unmarked.
- `_imgAttach` strips the mark → parked ref, no local attach; base ref
  resolves local bytes.
- Wire path (no `fmark`) emits refs unmarked.
- ADR-1021 union-helper pins updated to the `fmark` call sites.
