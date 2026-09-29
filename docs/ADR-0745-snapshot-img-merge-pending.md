# ADR-0745: drop the spurious img pending after a losing snapshot merge

## Status
Accepted (2026-09-28)

## Context
`_mergeSnapshotOp` runs `op = this._attachOp(op)` before the per-property
LWW merge. `_attachShape` unconditionally parks a string `s.img` blob ref
into `_imgPending[s.id]` — correct for the add path, but for an
**existing** shape the merge may reject `img` (local clock newer). The
registration survived anyway, so when the rejected blob arrived it still
resolved: `delete sh.img; sh.dataUrl = data` — the losing image
clobbered the winner's `dataUrl`. Symmetrically, the spurious `set` also
clobbered a legitimate pending entry the local shape already held.

## Decision
After the merge loop, reconcile the pending map:

```js
if(_iS(op.shape.img)&&ex.img!==op.shape.img&&this._imgPending.get(ex.id)===op.shape.img)
  this._imgPending.delete(ex.id);
```

- `op.shape.img` unset → `_attachShape` resolved it inline (dataUrl
  merges as a normal prop) or there was no ref — nothing to do.
- `ex.img === op.shape.img` → `img` won the merge (or was already equal)
  → pending is legitimate, keep it.
- mismatch → `img` lost → drop the registration. A different pre-existing
  parked key on `ex` is unreachable anyway (per-id map, already
  overwritten); the ADR-0629 board-scan drain still resolves it.

## Consequences
The LWW-verdict props and the blob-delivery props can no longer disagree:
a losing `img` ref never writes into `ex.dataUrl`. ~1 line; behavioural
pin covers both losing and winning merges.
