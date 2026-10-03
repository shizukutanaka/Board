# ADR-0933: op-clock ↔ envelope-peer binding coverage audit

## Status

Accepted (2026-10-01) — audit complete, no new defect

## Context

ADR-0931/0932 bound `clock.peer` to the envelope `peer` on the two op
intakes ('op' and 'snapshot'-embedded ops). This round audited whether
any path still feeds `Store.applyRemote` without the binding, and what
binding can and cannot achieve.

## Audit

**applyRemote entry points** — exactly two wire-facing sites:
- `case 'op'` in `_onRecv` — gated by `op.clock.peer!==msg.peer` (0931).
- `_mergeSnapshotOp` unknown-shape path — the 'snapshot' intake drops
  embedded ops with `op.clock?.peer!==msg.peer` before merge (0932).

**Fragment reassembly** — 'opc'/'snap' fragments join via `_fragIn`,
then the reassembled JSON is re-entered through `this._onRecv(joined)`,
not dispatched directly to `applyRemote`. The early `msg.peer===_pi()`
self-drop and the 0931 clock gate both apply to the reassembled message —
no bypass. Pin added so reassembly must keep re-entering `_onRecv`.

**Residual, accepted**: a forger can still claim a *third party's*
identity uniformly (`msg.peer` and `clock.peer` both = victimB). This is
inherent to the unauthenticated-envelope threat model — `msg.peer` has no
cryptographic binding to the transport, so presence, cursors, names and
selections all trust the declared identity equally. The harm closed by
0931/0932 is specifically claiming *the receiver's own* id — the only
identity a receiver can locally verify (it knows its own `_pi()`). Seq
squatting against third parties requires already-compromised
intermediation; consistent with the project's no-auth wire posture.

**'snap:' seq namespace** — snapshot ops' `seq:'snap:'+id` values never
collide with live-commit integer seqs, and the embedded-clock gate now
prevents cross-peer squatting of the victim's `victim:snap:*` entries.

## Decision

No code change beyond coverage pins. Documented as the audit-complete
record for the clock-binding cluster (0931→0932→0933).
