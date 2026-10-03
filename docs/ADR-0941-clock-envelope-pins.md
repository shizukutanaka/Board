# ADR-0941: behavioural pins for the clock↔envelope peer binding

## Status

Accepted (2026-10-01)

## Context

ADR-0931 bound `op.clock.peer` to the wire envelope `msg.peer` at the
`_onRecv` 'op' intake, and ADR-0932 extended the same binding to
snapshot-embedded ops at the merge gate (`_mergeSnapshotOp` is only
reached when `op.clock.peer===msg.peer`). Ops and snapshots are never
relayed — every op arrives directly from its producer — so an op clock
naming a third party is provably forged: it could seq-squat the victim's
`seenOps` window (every later legit op of the victim dedup-dies) and stamp
attacker-controlled wclocks under the victim's id. ADR-0933 audited
coverage of both arrival paths, but only *source* pins existed
(`test.mjs` checks the guard strings are present) — a behavioural
regression (guard removed, bypassed, or reordered) would pass silently.

## Decision — pin the binding at the real `_onRecv` intake

Three behavioural pins in `test.mjs` (single world, real intake):

1. **Envelope-matched op applies** — `k:'op'` with `msg.peer` equal to
   `op.clock.peer` reaches `Store.applyRemote` and lands the patch.
   (Baseline sanity that the guard doesn't over-reject legit traffic.)
2. **Mismatched op rejected (0931)** — the same envelope carrying an op
   whose `clock.peer` names a different id leaves the shape untouched.
3. **Snapshot-embedded forged op rejected (0932)** — a `k:'snapshot'`
   whose `ops[]` entry has `clock.peer` ≠ `msg.peer` is never merged —
   the shape never appears.

The pins save/restore `state._lastTs` around the block: earlier tests
leave the HLC floor far ahead of wall time, which would stamp the local
commit's wclocks ahead of any realistic remote `ts` and make the LWW
arbitration a fixed loser for the remote side — masking any regression
of the binding itself.

## Consequences

- 3 asserts; a removed/weakened/reordered guard now fails a named pin.
- The `wc` maps on snapshot ops remain intentionally *unbound* — they
  carry shared third-party history (legitimate writes by other peers),
  not writer attribution, and ADR-0932's merge gate already keeps them
  from being planted under a forged `clock.peer`.
- No index.html change (test-only round) beyond the version bump.
