# ADR-0931: bind `op.clock.peer` to the wire envelope's `peer`

## Status

Accepted (2026-10-01)

## Context

`seenOps` dedup and per-property LWW attribution key on the op's
self-declared `clock.peer`. Intake validated its *shape* (`_iS`/`_iN`) but
never bound it to the sender: an op arriving with
`clock.peer` = the receiver's own peer id was accepted.

Two concrete harms, both reachable from any remote peer (RTC) or hostile
tab (BC):

1. **Seq squatting** — forge ops with `clock.peer = victimId, seq = 0..N`.
   Receivers record `victimId:seq` in `seenOps`; the victim's real commits
   (`commit()` → `_sO().has(k)` → early return) are then dropped as
   duplicates — the victim can no longer edit (no apply, no broadcast).
   `state.seq` is a per-boot monotonic counter — trivially predicted.
2. **Identity-stamped wclock writes** — `_stampWrites` records
   `w[K].peer = victimId`, so forged writes acquire the victim's LWW
   identity (including `_lwwSkip`'s own-write arbitration shortcuts).

Ops are **never relayed** — a message's `k:'op'` always comes directly
from the op's producer (`broadcast()` → `_bcast`/`_sendDC`, no
re-broadcast in `_onRecv`). Legitimate ops therefore always satisfy
`op.clock.peer === msg.peer`.

## Decision

- RTC `k:'op'` envelopes now carry `peer:_pi()` like the BC `_mk('op')`
  envelope (they previously omitted `peer` entirely).
- Intake rejects `k:'op'` where `op.clock.peer !== msg.peer`.
  Combined with the existing `msg.peer === _pi()` drop, a forger can only
  claim identities other than the receiver's — seq-squatting against the
  receiver is closed; impersonating a made-up peer is harmless.

Interop note: peers running older builds send `k:'op'` envelopes without
`peer` on RTC; their ops are now dropped (same accepted-compat posture as
ADR-0739–0742). BC sends were already envelope-complete.

Snapshot-embedded ops (`_mergeSnapshotOp`, `'snap:'` seqs, `add`-only
gated) are a separate intake path and intentionally out of scope.

## Consequences

- Forged `clock.peer` ops die at intake on both transports; behavioural
  pins cover the drop, the normal apply, and self-impersonation.
- ~50B added (envelope `peer` + one gate).
