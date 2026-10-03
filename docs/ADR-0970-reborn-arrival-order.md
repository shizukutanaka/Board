# ADR-0970: reborn guard marks arrival order, not clock order

**Status**: Accepted (defect fix — convergence)
**Version**: 1.7.996

## Context

ADR-0969 added `_rb`, the born-guard that decides whether a gesture-cancel
restore (`_gRst`) should skip a shape: a shape (re)born mid-gesture by a
remote op (kill+resurrect, wholesale swap) must NOT be orig-restored, or the
restore clobbers the remote value.

`_rb` answered with a clock comparison: `w._born.peer!==_pi() &&
clockNewer(w._born, ptr.armC)` where `ptr.armC` was stamped at pointer-down.

## Problem — the clock comparison diverges under skew in BOTH directions

`clockNewer` compares the remote peer's wall timestamp against our local
arm time. Two skew modes corrupt the predicate:

1. **Peer clock AHEAD** (the dangerous one): a born that causally arrived
   BEFORE the gesture armed carries `ts > armC`. `_rb` returns true →
   restore is wrongly skipped → the shape keeps its in-flight dragged
   position after cancel. Peers rolled the drag back; we kept it —
   **permanent one-way divergence**, and it silently corrupts `_gTouch`'s
   orig-merge bookkeeping too.
2. **Peer clock BEHIND**: a born that causally arrived mid-gesture has
   `ts < armC`. `_rb` false → restore proceeds → orig geometry overwrites
   the remote-reborn shape — the defect ADR-0969 documented as a residual
   limitation.

`MAX_TS_SKEW` (5 min) bounds intake but is far wider than any gesture; both
failure modes are well inside it.

## Decision

Replace the clock comparison with **exact local arrival order**: a
per-gesture `ptr.reborn` set, marked inside `_bT` (the single
born-stamping choke point) only when the birth carries a remote clock
(`c.peer!==_pi()`) and lands while `ptr.down`.

```js
// _bT:
if(!w._born||clockNewer(c,w._born))w._born=c;
if(ptr.down&&c.peer!==_pi())(ptr.reborn||(ptr.reborn=new Set())).add(id);

// _rb:
const _rb=id=>!!(ptr.reborn&&ptr.reborn.has(id));
```

`ptr.armC` is removed entirely (field, PD stamp, `_ptrReset` reset);
`ptr.reborn` replaces it in the ptr literal and `_ptrReset`.

## Why this is correct

- The predicate's semantics are "did a remote (re)birth of this shape
  arrive while this gesture was live" — a purely local, observable fact.
  Arrival order needs no clock at all; skew cannot express itself.
- `peer!==_pi()` stays load-bearing: local births during `ptr.down`
  (alt-drag copies, own commits) carry `c.peer===_pi()` → unmarked →
  `_rb` false → their origs still restore (the ADR-0964 regression stays
  closed).
- Backward applies (undo/redo) never mark: they only run after
  `_cancelPointerGesture`, so `ptr.down` is always false on their `_bT`
  calls.
- `ptr.reborn` is a `Set` on `ptr`, never inside `state.wclock` — no
  wire-serialization or persistence contamination.
- `_bT` covers every remote born surface (add/addMany/del-backward/
  clear-backward/replace/pageAdd/pageDel-backward): remote kill+resurrect,
  undo-wire resurrections, and wholesale swaps all mark.

## Consequences

- The ADR-0969 residual limitation (clock-skew restore clobber) is closed;
  the opposite-skew spurious-skip defect it didn't document is closed too.
- Net code is smaller: `armC` machinery (~200B) out, `reborn` (~120B) in.
- Pins: the ADR-0969 behavioural block keeps its assertions and gains two
  skew-case pins — a skewed-ahead born landing BEFORE the arm still
  restores (arrival, not ts, decides), and a trailing-skew born landing
  DURING the arm still skips restore. Both fail under the clock-compare
  form; both pass under arrival marking.
- The `ptr.down=true;ptr.x=ptr.x0` contiguity pin is preserved (the armC
  stamp moved off that line).
