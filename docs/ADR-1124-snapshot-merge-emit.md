# ADR-1124 — snapshot merge propagates joiner-newer divergent props

**Status**: implemented (v1.8.148)

## Context

The snapshot join channel is **one-directional**: each `add` op in
`_snapshotMsg` carries `{shape, wc}` — the *responder's* values and clocks.
`_mergeSnapshotOp` therefore only resolved props where the remote clock won.
When a rejoining peer's local prop clock was newer than the responder's, the
local value stayed put — but the responder (and every other peer) kept the
stale value **forever**. No later op ever described the divergence; the
joiner's newer write was invisible to the room.

The op path already propagates winners both ways (ops are broadcast). The
snapshot path resolved only remote-wins → asymmetric permanent divergence.

## Decision

`_mergeSnapshotOp` emits a convergence `upd` for each divergent
**local-winning** prop, through the same `_txE`/`_txFlush` drain ADR-1123 added:

- `k`, `b` = the remote's own value (or omitted when the remote had none),
  `a` = the local winner.
- The emitted `upd` is a genuine local commit: fresh `{peer,seq,ts}` clock,
  history push, broadcast — the responder's per-prop LWW then converges on the
  same end state.
- **Equal values emit nothing** — idempotent, no re-join traffic storm.
- `state.ro` swallows the emit (read-only boards never write back).
- Emit eligibility `_emOK` mirrors `_stripStruct` plus `img`/`dataUrl`
  (blob plumbing, not upd-valid), `locked`/`type`/`id` (forged-key window
  closed by ADR-1122/0990), and `validPatch`.

Two seams:

1. **Divergence seam** — inside the per-key merge loop, when the local clock
   wins but values differ.
2. **Sweep seam** — props the responder never stamped (`!(k in rw)`): the
   remote's `wc` has no clock for them, so they still reach the emit check
   (baseline = the remote's shape value or nothing).

The responder applies the `upd` normally: its `before` is the value it already
holds, so `_chg` self-detects no divergence and the local winner lands.

## Tests (12 pins, test.mjs)

- Divergent local-newer prop emits one grouped `upd` per shape —
  `before` = remote value, `after` = local value; local value/clock preserved.
- Remote-won and equal-valued props emit nothing.
- Remote-clock-less props emit via the sweep (`before` = remote's shape value).
- `img`/`dataUrl`/`locked`/`type` and equal values never emit.
- The pre-existing "merge writes no undo history" pin now asserts exactly one
  history op — the emit is a real op, never a silent history write.

## Size

Severed/over-long comment tails compressed back under the raw ceiling
(~700B reclaimed).
