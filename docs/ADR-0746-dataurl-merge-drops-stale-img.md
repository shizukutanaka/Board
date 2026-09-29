# ADR-0746: a merged dataUrl drops the still-parked img ref

## Status
Accepted (2026-09-28)

## Context
Sibling defect to ADR-0745. An existing shape can hold a **parked** `img`
ref (`_imgPending[id]` waiting for its blob). When a snapshot merge then
writes `dataUrl` (any peer's newer write — e.g. a replace-image authored
against a resolved copy), the parked ref survives: `ex.img` stays set and
`_imgPending[id]` still points at the OLD key. When that blob arrives the
resolution writes `sh.dataUrl = data` unconditionally — the stale image
clobbers the dataUrl the merge explicitly adopted.

## Decision
Track `dataUrl` merges in the loop (`duNew` flag). After the merge,
before the dirty check:

```js
if(duNew&&_iS(ex.img)&&this._imgPending.get(ex.id)===ex.img){
  this._imgPending.delete(ex.id);
  delete ex.img;   // else the ADR-0629 board-scan drain still resolves it
}
```

Both ref and pending must go: `_imgPending` is the fast path, but the
ADR-0629 sweep resolves `s.img === key` by board scan, so leaving the
ref would still let the old blob clobber the merged `dataUrl`.

Safe: a shape never legitimately carries both `img` and `dataUrl` —
the wire slim form emits one or the other. Winning `img` merges keep
their pending (guarded by `duNew`, not by img equality).

## Consequences
LWW verdict and blob delivery can no longer disagree in either
direction (0745 covers a losing `img`, 0746 covers a winning
`dataUrl`). ~1 flag + 1 line; 4 behavioural asserts pin both sides.
