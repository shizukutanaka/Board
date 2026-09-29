# ADR-0730 — 'beautify' rides the wire (pen→rect retype converges)

## Status
Accepted (v1.7.756)

## Context
`doBeautify` converts confident pen strokes into recognised geometry
(rect/ellipse/line). It was designed "local-only" — but `_recordCommitted`
broadcasts EVERY committed op whose clock is ours, so the beautify op DID go
out on the wire. Every receiver then dropped it: 'beautify' is not in
`REMOTE_OPS` and `validRemotePayload` had no case for it. Result: the sender
retyped its pen into a rect while every peer kept the pen — a permanent,
guaranteed divergence for the whole session.

"Local-only" cannot actually prevent that divergence (the sender still
changes the shape); only propagating the retype converges.

## Decision
Make 'beautify' a first-class wire op:

1. `REMOTE_OPS` gains 'beautify'.
2. `validRemotePayload` gains the style-family case (`patches(before/after)`
   + `noLock` on both).
3. `_lwwOp` gains 'beautify' — `_lwwDrop`'s generic after-patch branch and
   `_stampWrites`' patch branch arbitrate per-key via the op clock (a newer
   remote `stroke` edit of the pen isn't clobbered by an in-flight retype).
4. `_slimOp`'s `locked`-strip family covers 'beautify' too — a pen carrying a
   falsy `locked` key would trip the receiver's `noLock` gate (same class as
   ADR-0717).
5. `_apply`'s patch loop strips `_`-keys for every op except 'beautify',
   where it strips `type` too — inverted: for beautify keep `type` (the
   retype IS the op) but drop `_`-prefixed internals a crafted op could
   smuggle onto the shape.

## Consequences
- A peer's retype now lands identically on all peers; convergence holds.
- Local undo/redo unchanged — `before`/`after` patches already rode the op.
- Older peers still drop the op (validator) — divergence scoped to
  mixed-version rooms, same caveat as 'replace' (ADR-0613).
