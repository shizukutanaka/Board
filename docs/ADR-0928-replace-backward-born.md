# ADR-0928: 'replace' backward stamps the undo clock as _born

## Status

Accepted (2026-10-01)

## Context

Undoing a wholesale swap (`'replace'` backward) restores the recorded
pre-swap `wclock` map wholesale: `state.wclock = _wM(clone(op.wc))`. But the
`_bT` stamp ran only inside the `if(forward)` block — restored shapes kept
whatever born the pre-swap map recorded (or none).

Peers do not share that path: the undo-wire (`_undoWire`) emits
`{op:'replace', after:op.before, afterWc:op.wc, clock:U}`, which receivers
apply **forward** — and the forward block stamps `_bT(id,U)` on every
restored shape. So after the same undo:

- undoer: `wclock[X]._born = B0` (the original, pre-swap birth)
- peers:   `wclock[X]._born = U`  (the undo's fresh clock)

Any later `del` whose clock lands in the window `B0 < D < U` — a third peer's
deletion issued before observing the undo — then kills the shape on the
undoer (`_bN` sees `B0 < D`) while peers skip it (`U > D`). One-peer-dead
divergence — the same class ADR-0926/0927 closed elsewhere.

## Decision

Run the `_bT` stamp in both directions: hoist
`for(const s of _sh())_bT(s.id,op.clock)` out of the `if(forward)` block so
the undoer stamps `U` exactly like peers' forward apply. The wholesale
`wclock` restore stays as-is — it is already the identical map both sides
compute from (`op.wc` locally, `afterWc: op.wc` remotely).

No merge step is needed on backward: every clock the undoer holds is
causally older than `U` (HLC — the undoer observed them before committing),
so nothing local can outrank the recorded map.

## Consequences

Restored borns are identical on the undoer and every receiver — mid-window
dels now arbitrate the same outcome everywhere. Behavioural pin covers the
restore, the `U` stamp, and the losing mid-window `del`.

## Pins

`node test.mjs` — 3 asserts (ADR-0928 block): pre-swap shape restored,
`_born === U` on the undoer, and a `del` clocked between `B0` and `U` losing.
