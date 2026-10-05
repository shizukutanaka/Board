# ADR-1018: `_dcQ` backpressure queue ordering audit

## Status

Audit complete — structurally safe (behavioural pin added, v1.8.044).

## Context

`_sendDC` is the single funnel onto the RTC DataChannel. A send that
throws (channel momentarily unable to accept) arms `_dcQ`; once armed
every send enqueues behind it so per-peer message order is preserved.
`onbufferedamountlow` drains the queue FIFO via `_sendDC` again.

## Invariants verified

- **No starvation class:** presence (cursor `@CURSOR_THROTTLE_MS`,
  selection `_lastSelSent`-deduped) and ops share one FIFO — worst
  case is bounded staleness, never starvation. Presence senders are
  already throttled upstream so a burst can't flood the queue.
- **Caps:** queue is capped at 4096 msgs / 32 MiB total (`_dcQB`),
  dropping the NEW message on overflow — a full queue can't be
  poisoned by a flood, and an oversized message (>256 KiB, SCTP
  max) is dropped before it can sit at the head forever (ADR-0438).
- **Lifecycle:** `dc.onclose` and `Net.init` (room switch) reset
  `_dcQ`/`_dcQB` (ADR-0446/0448) — dead-link messages don't queue
  forever, no cross-room leak.
- **Ordering across re-arms:** drain sets `_dcQ=null` first, then
  re-sends each item — a mid-drain throw re-arms a fresh queue with
  subsequent items appended in order. The only throw class that can
  interleave is a channel-state error, under which all remaining
  sends throw too → order preserved. (Any residual inversion is
  harmless: every op apply is idempotent + clock-arbitrated.)

## Pin

- Thrown `dc.send` arms `_dcQ`; later sends queue behind it
  (`_ln(_dcQ)===2`); `bufferedAmountLowThreshold===65536`;
  `onbufferedamountlow` drains `['qa','qb']` FIFO and releases the
  queue; a 262,145-byte message is dropped without arming.
