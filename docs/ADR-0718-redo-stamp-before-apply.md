# ADR-0718: redo restamps before the local apply (stamp-once invariant)

## Status
Accepted (実装済)

## Context
ADR-0717 made `undo()` restamp `op.clock` BEFORE `_apply(op,false)` so local
backward arbitration and the undo-wire ops share one fresh clock.

`redo()` had the mirrored shape: `_apply(op,true)` ran under the stale clock,
then `_fck(op)` restamped for the broadcast. For forward applies this did not
diverge — the forward path performs no wclock arbitration (`_lwwSkip` is
backward-only), so the local write and the wire write always produced the same
value — but the op existed with two different clocks over one redo call, which
is exactly the precondition that bit us on the undo side.

## Decision
`redo()` now `_fck(op)`s before `_apply(op,true)` — one stamp, one clock for
the whole op lifecycle (history entry, local apply, `_stampWrites`, broadcast).
`_stampWrites` and `_lastRep` read `op.clock` unchanged — now guaranteed to be
the same clock the wire carried.

This is an invariant fix, not a divergence fix: local forward apply is
unconditional, so the old order converged anyway. Canonicalizing the order
keeps it that way even if a future forward path learns to arbitrate.

## Consequences
- `undo()` and `redo()` now share a single symmetric shape: restamp → apply →
  stampWrites → broadcast.
- Pin: `html.includes("_fck(op);   // ADR-0718")`.
