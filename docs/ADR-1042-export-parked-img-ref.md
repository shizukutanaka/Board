# ADR-1042: exports ride a parked img ref through

## Status

Accepted (v1.8.068).

## Context

`roundShapesForExport` unconditionally ran `delete o.img` (ADR-0035),
dropping the internal blob-ref on the grounds it was meaningless outside
the local store. That was true before ADR-1041: imported refs could never
resolve anyway.

## Problem

A shape carrying only a parked `img:'k:N'` ref (its blob never received)
exported with **no content pointer at all** — the recipient got an image
shape with neither `dataUrl` nor `img`: a permanent, unhealable
placeholder, strictly worse than the live board which still parks and
heals the ref.

Materializing the blob at export was rejected as dead code: a parked ref
means the blob is absent from every local store (`_imgIn`/`_imgSent`/IDB
imgs) — any arrival drains the park and sets `dataUrl`, ending the park.

## Change

`roundShapesForExport` now drops the ref only when `dataUrl` supersedes it:

```js
if(_iS(o.img)&&_iS(o.dataUrl))delete o.img;   // ADR-1042
```

A parked ref rides the export; on import (share-link `importFromHash`,
`.board` `importBoard`, paste `addMany`) the ADR-1041 `_attachShape` gate
parks it and the imgq re-request loop heals it whenever a peer holding
the blob shares the room. Worst case the ref expires harmlessly — same
placeholder as before, but with a live heal path.

## Verified

- Source pin on the conditional delete; behavioural pins: ref-only shape
  keeps `img`, img+dataUrl drops the ref, dataUrl-only and non-image
  shapes unchanged (test.mjs).
