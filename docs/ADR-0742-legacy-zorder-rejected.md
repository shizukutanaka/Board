# ADR-0742: legacy wholesale zorder rejected on the wire

## Status
Accepted (2026-09-28)

## Context
`validRemotePayload` accepted two zorder forms: Step2 minimal-delta
`{changes:[{id,before,after}]}` (per-shape frac LWW, ADR-0653) and the pre-Step2
legacy `{after:[{id,z,frac}]}` wholesale snapshot.

The legacy apply path writes `z`/`frac` unconditionally on **every** entry —
`_lwwDrop` returns early for `!_iA(op.changes)` and `_stampWrites` stamps
nothing. A raced legacy reorder therefore clobbers a newer per-shape frac write
with no clock arbitration and no convergence path to heal (positions are
LWW'd per prop; frac only converges through `changes` ops).

No live producer emits the legacy form: `_zCommit` only makes `changes`, remote
ops never enter undo history (so the `_undoWire` legacy branch can't be reached
from a wire-sourced op either), and stale-SW pre-Step2 tabs are exactly the
mixed-version source ADR-0741 closed for move deltas.

## Decision
Remote 'zorder' requires the `changes` array. The `_apply` legacy branch and
the `_undoWire` `op.before` fallback stay as defensive no-ops for any
locally-recorded legacy history op — unreachable from the wire now.

## Consequences
- Pre-Step2 peers' reorders are dropped on current-version peers — their
  wholesale write could no longer silently roll back newer frac writes.
- Behavioural pins: `changes` form still applies; legacy form rejected both at
  `validRemotePayload` and end-to-end through `_onRecv`.
