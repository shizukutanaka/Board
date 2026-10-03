# ADR-0932: bind snapshot-embedded op clocks to the envelope peer

## Status

Accepted (2026-10-01)

## Context

ADR-0931 bound `k:'op'` ops' `clock.peer` to the envelope. The same
unbound clock survived one hop deeper: `k:'snapshot'` carries embedded
ops (`msg.ops[]`), and on the **merge path** (`_mergeSnapshotOp`, taken
whenever the receiver already has shapes) each embedded op flows into
`Store.applyRemote` under its self-declared `clock.peer` — unchanged.

Same harms as 0931, arriving inside a snapshot instead of an op:

1. **Seq squatting** — a forged embedded op with
   `clock.peer = victimId, seq = 'snap:<id>'` records `victim:snap:<id>`
   in `seenOps`; the victim's genuine snapshot adds (which carry
   `snap:` seqs from `_snapshotMsg`) dedup-drop on the receiver, so a
   resync heals everyone except the targeted-shape entries.
2. **Impersonated wclock stamps** — `applyRemote`'s `_stampWrites` and
   the `_wAdopt` path attribute existence/prop clocks under the forged
   peer identity.

## Decision

At the `case 'snapshot'` intake, skip embedded ops whose
`op.clock?.peer !== msg.peer` — ops are produced by the snapshot sender
itself (`_snapshotMsg` stamps `peer:_pi()` on every embedded op), so the
equality is invariant for legitimate senders. Fully backward-compatible:
the sender-side code already satisfies it, so only forged traffic drops.

Out of scope (correctly unbindable): the `op.wc` maps inside embedded
ops carry *other peers'* legitimate write attributions — the sender
relays the shared LWW history, so `wc[k].peer` is intentionally not
envelope-bound. The empty-board path (`_applySnapshot`) consumes only
`wc` maps, never `clock.peer`, so it needs no gate.

## Consequences

- Forged clock.peer dies on every op-bearing intake: `k:'op'`,
  `k:'opfrag'` (reassembles into 'op'), and `k:'snapshot'` merge ops.
- Behavioural pins cover drop-on-mismatch and apply-on-match.
