# ADR-1065: img-ref × dataUrl coexistence — the written prop wins

- Status: accepted
- Date: 2026-10-01
- Related: ADR-0031 (blob store), ADR-0069 (wire img refs), ADR-0745/0746/0747 (merge-side ref hygiene), ADR-0841 (`_oa` park gate), ADR-1033 (foreign-ordinal mark)

## Context

A shape's image is carried two ways: inline `dataUrl` bytes, or an `img` ref
into the content-addressed blob store. Both can end up on one shape: a stale
ref survives a `dataUrl` update (`replaceImage` set bytes without clearing
`s.img`), and a ref adopted by a patch or snapshot merge can land next to a
stale `dataUrl`. Coexistence was never designed — every resolution site
(`_imgAttach`, blob arrival, `_imgRescan`, `_attachShape`) treated "ref means
bytes are absent".

Three divergence holes followed:

1. `_mergeSnapshotOp` adopted `ex.img=K_new` (via `ex[k]=v` in the LWW loop)
   without parking it when the incoming shape also carried bytes —
   `_attachShape` parks only ref-only shapes, so the adopted ref had no
   `_imgPending` entry and imgq heal never asked for the blob.
2. `replaceImage` and remote `dataUrl` patches left the old `img` ref on the
   shape. A coincidental blob arrival for that stale key (a peer legitimately
   sharing the blob, an imgq answer, a re-park) then **clobbered the fresh
   `dataUrl` with the old image** via the blob-arrival straggler scan —
   silent regression.
3. Persisted/imported shapes could carry both fields and stayed that way.

## Decision

The prop a patch or merge *writes* declares intent:

- `dataUrl` written → bytes win: `delete r.img` (+ drop its pending entry).
  The ref is content-derivable via `_imgHash`, so nothing is lost — a later
  emit re-slims the bytes into the same key.
- `img` written (no `dataUrl` written) → ref wins: park it for imgq heal even
  when a stale `dataUrl` survives; the arriving blob replaces `dataUrl`
  (same convention as the winning-merge test since ADR-0745).
- Neither written → unchanged (a ref-only shape stays parked).

Sites:

- `_oa` — every patch application funnels here:
  `if(r.dataUrl&&r.img&&'dataUrl' in p)delete r.img` then park
  `r.img` when `!r.dataUrl || 'img' in p`.
- `_mergeSnapshotOp` — track `imgNew` in the LWW loop; the epilogue drops
  `ex.img` unconditionally on `duNew`, else parks the adopted ref
  (stripping a surviving `@` foreign-ordinal mark first).
- `_imgAttach` — a persisted coexistence strips the ref at load.
- `replaceImage` — `delete s.img` alongside `s.dataUrl=`.

## Consequences

- The stale-ref clobber hole is closed at the shared funnel rather than per
  arrival site: a live shape can only hold a stale `img` ref while it is
  ref-only, which is exactly the state the straggler scan and imgq heal
  expect.
- Adopted refs heal the same on the merge path as on the add path — the
  snapshot sender's ref becomes a parked request, not a dead prop.
- `replaceImage` receivers converge through the style op's inline `dataUrl`
  (untouched); the local `delete s.img` keeps the sender's shape clean for
  the next slim emit.
- Local dataUrl patches that *restore* a ref-less shape (`before` records)
  are unaffected: `dataUrl:undefined` restores write falsy → ref survives
  → park.
