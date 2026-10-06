# ADR-1052: `_dcQ` two-class drain — presence coalesces, ops stay FIFO

## Context

ADR-1048 (the 50/50 audit) flagged the backpressure queue as a single-class
FIFO: when the SCTP buffer fills, every outbound message — cursor positions
that refresh 16×/s as well as causal ops — queues indiscriminately and
replays in order on `bufferedamountlow`. A burst of cursor traffic queued
behind bulk traffic (snapshot fragments, img chunks, ops) replays stale
positions the receiver no longer needs: pure wasted wire time that delays
the ops that matter.

Ranked in ADR-1048 as **P2-b — ops ahead of presence**.

## Decision

`_sendDC(m, eph)` gains an ephemeral-kind parameter. Two buffer classes:

- **Ops class** (`_dcQ`, array): unchanged — causal, every entry must send,
  faithful FIFO, existing 4096-entry / 32MB caps and `_dcQB` accounting.
- **Presence class** (`_dcQp`, Map): keyed by `eph` (the message kind).
  Latest-wins per kind — a queued `cursor`/`selection` replaces the prior
  entry for that kind rather than appending.

On drain (`onbufferedamountlow`): ops queue first, then the newest presence
per kind. Direct sends are unaffected — coalescing only exists while a
drain is armed, which is exactly the window where staleness accrues.

`_bcast` tags the two ephemeral kinds it carries — `cursor` (including the
`h:1` hide, which is itself just the latest cursor state) and `selection` —
with their kind; everything else (`bye`, `name`, `imgq`) stays ops-class
because it is causal/durable, not presence.

All `_dcQp` lifecycle is tied to the same resets as `_dcQ`: `dc.onclose`,
`onconnectionstatechange 'failed'`, and the drain itself.

## Why not the alternatives

- **Priority head-insert for ops**: still replays every stale presence
  message; the point is that stale presence has zero value — drop it.
- **Timestamp-based staleness check on drain**: extra bookkeeping; the
  latest-per-kind map is strictly simpler and strictly better — an old
  presence value is never preferable to a newer one.
- **Coalesce `imgq` too**: `imgq` requests are idempotent but each carries
  a distinct key; coalescing by kind would drop all but one blob request —
  wrong. They stay ops-class.

## Consequences

- A long backpressure window now sends O(kinds) presence entries instead of
  O(sends) — a 60fps cursor storm collapses to one message.
- Ops can't be reordered past a queued presence, but presence ordering vs
  ops has no causal requirement (presence carries no clocks).
- Contract for new ephemeral kinds: pass a stable kind string as `eph`
  when calling `_sendDC`; anything without `eph` is ops-class by default.

## Verification

Behavioural pins in test.mjs: enqueue ops + interleaved presence under a
simulated full buffer; drain delivers `['op1','op2','cur2','sel1']` —
ops FIFO first, then only the latest presence per kind; both buffers
cleared. Source pins cover the `_bcast` eph tagging and the lifecycle
resets.
