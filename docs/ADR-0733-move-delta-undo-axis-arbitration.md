# ADR-0733: delta-path move undo arbitrates per axis

Status: implemented (v1.7.759)
Context: ADR-0717 (undo wires arbitrate via the fresh undo clock), ADR-0729 (wire move ops carry absolute positions), ADR-0732 (absolute backward restore + `_lwwSkip` parity on the patch path).

## Problem

Locally recorded `move` ops carry `{ids, dx, dy}` only — the gesture applies the
delta before `_recordCommitted` ever sees it, so the recorded op has no
before/after patch arrays. Its undo therefore takes the **delta backward
path**, which ran `-dx/-dy` unconditionally:

- A remote write racing the undo on one axis (e.g. `x`) with a clock that beats
  the undo's fresh clock wins on the peers: `_lwwDrop` removes that axis from
  the wire op's derived `after` — the peer keeps its arbitrated value.
- But the undoer's own backward had already un-moved the axis — the undoer and
  every peer disagree on that axis. Convergence hole in the last un-arbitrated
  backward path.

The absolute path (ADR-0732) already gates each key through `_lwwSkip` on a
clone of the recorded patch; the delta path had no equivalent.

## Decision

`_apply` 'move' backward on the delta path now gates x and y independently:

```js
const ux=_lwwSkip(id,'x',op),uy=_lwwSkip(id,'y',op);
if(ux&&uy)continue;
_sT2(sh,ux?0:op.dx*d,uy?0:op.dy*d)
```

- An axis a newer remote write owns stays at the remote-winning value —
  identical to what `_lwwDrop` does to the wire op's `after` on every peer.
- `Shape.translate` takes `(dx,dy)` — a skipped axis is a `0` translate, so
  pen `pts`, connector `x1/y1/x2/y2/way/bend`, and box `x/y` all move per-axis
  uniformly. `translate(0,0)` would be a no-op write, hence the early
  `continue`.
- Forward applies are untouched (`forward` skips the gate entirely and keeps
  populating `op.moved`).

## Why not whole-shape skip

Skipping the shape when either axis is arbitrated out would leave the other
axis moved on the undoer while the peer still applied the wire's `after` for
it — same divergence, one axis over. Per-axis gating mirrors per-key `_lwwDrop`
exactly.

## Test

Racing `upd{x:150}` at `ts=9e15, seq=99` lands on both peers (it beats the
undo's restamped clock). Undo of a recorded `{dx:10,dy:5}`: the undoer keeps
`x=150`, un-moves `y` to `0`; the peer drops x from the wire op, applies y —
both land at `(150,0)`.
