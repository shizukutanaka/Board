# ADR-0732 — move undo rides the absolute wire too

## Status
Accepted (v1.7.758)

## Context
ADR-0729 made wire `move` ops carry absolute `after`/`before` positions so a
move racing an absolute write converges via per-key LWW. Two delta remnants
survived:

1. `_undoWire` emitted `{op:'move',ids,dx:-dx,dy:-dy}` — a peer where the
   forward move had lost LWW (it kept a racing write, e.g. x=150) applied
   -dx off that different position (140) while the undoer restored 100.
   Guaranteed divergence, one undo after every contested move.
2. `_apply` backward used the same blind -delta — the recorded `op.before`
   absolute positions existed but were never read, and no `_lwwSkip`
   arbitration ran locally (the shared patch path has this parity already).

## Decision
- Backward absolute path in `_apply` 'move': `forward?op.after:op.before`,
  locked-skip + `_lwwSkip` per key on a clone (never mutating the recorded
  patches). Ops recorded pre-0729 (no patch arrays) keep the delta path.
- `_undoWire` carries the explicit swap (`after:op.before, before:op.after`)
  alongside dx/dy. On the wire `_slimOp` re-derives after/before from live
  positions anyway — which post-undo equals the restored positions — so the
  wire op says "the shape is now here", matching whatever arbitration the
  undoer itself landed on. dx/dy stay for the validator and legacy peers.

## Consequences
- A contested move's undo converges on every peer (undo's fresh clock wins
  uniformly, per ADR-0717 semantics).
- A shape re-moved between forward and undo now restores the RECORDED
  position, not position-minus-delta.
- Delta receivers (pre-0729) keep old behaviour — same mixed-version caveat
  as ADR-0729.
