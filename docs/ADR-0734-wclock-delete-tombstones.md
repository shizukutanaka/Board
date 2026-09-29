# ADR-0734: wclock-embedded delete tombstones — existence arbitration for add-family ops

- Status: accepted (implemented)
- Date: 2026-09-28
- Round: 484 / v1.7.760

## Context

Per-property LWW (ADR-0002, extended through ADR-0733) arbitrates *values* of a
shape's fields, but **shape existence** had no arbitration at all:

- `del`/`add`-backward/`_pgDel2` *purged* `wclock[id]` — deleting the only
  evidence that a delete ever happened.
- `add`/`addMany`/`pageAdd` pushed a shape whenever `!byId(id)` — arrival
  order, not causality, decided existence.
- `_mergeSnapshotOp`'s union-heal `!ex` branch resurrects any missing shape —
  a snapshot that raced a delete (the del is in flight or lands later on the
  receiving side only) revived the shape on one peer and not the other:
  **permanent divergence with no further op to repair it**.

Lamport/CRDT literature calls this the add-wins vs remove-wins problem;
without a remove tombstone stored alongside the value clock, remove-wins
cannot be decided after the fact.

## Decision

Reuse `wclock` (ADR-0460, already persisted + wire-propagated via `wc` on
ops and snapshots) to carry tombstones:

- Every removal path writes `_wc()[id] = {_del: op.clock}` instead of
  `delete _wc()[id]`:
  - `del` forward (per non-locked shape),
  - `add`/`addMany` backward (undo of an add = a removal),
  - `_pgDel2` member purge (was `delete _wc()[id]`, ADR-0679 → tombstone).
- Every add-family push site consults the tomb first:
  - `add` forward, `addMany` forward, `pageAdd` member loop — skip when
    `clockNewer(wd._del, op.clock)`; otherwise `delete wd._del` so the id is
    free again. Snapshot `!ex` adds are covered for free: they route through
    `applyRemote → _apply 'add'` (ADR-0372 merge path).
- Local undo-of-add writes tombs too (commit and applyRemote share `_apply`
  forward/backward), so a local `undo(add)` converges under the same rule as
  a remote del — needed after ADR-0443 wired undo ops.

Deliberately **not** tombstoned: `clear`/`replace` — wholesale swaps are
already arbitrated by the `_lastRep`/`rep` causal-marker gate (ADR-0613..17),
so stale snapshots carrying pre-clear shapes are dropped before the add path
is even reached.

## Consequences

- **Inert stale tombs.** A tomb on a live, restored shape (`del` undo,
  `clear` undo, `pageDel` undo) is left in place intentionally: `!byId`
  keeps backward restore pushes out of the tomb gate, and the `op.wc`
  restore overwrites the entry for recorded ids. No clear-on-restore needed.
- **Bounded growth.** Hostile dels tomb every id — capped by
  `if(_ok(_wc()).length>8192)state.wclock={}` after the del loop (an ~2 MB
  flood of dead tomb entries collapses; a fresh sync heals real clocks).
- **`_stampWrites` cannot overwrite tombs** — it guards `byId(id)` and
  returns early for non-`_lwwOp` ops (del isn't one).
- **Wire validation** — `wcOk` accepts clock-object entries; `{_del:clock}`
  rides `op.wc` and snapshot `wc` unchanged.

## Test pin

`test.mjs` behavioural block: remote del tombstones the id on the peer; a
stale (older-clock) `add` is dropped; a newer-clock `add` wins and clears the
tomb. Source pin updated: `_pgDel2` writes `{_del:op.clock}`.
