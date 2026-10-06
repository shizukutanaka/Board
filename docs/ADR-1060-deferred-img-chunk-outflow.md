# ADR-1060 — congested send-queue defers staged image chunks

## Status

Accepted (v1.8.083). Follow-up to ADR-0432 (`_dcQ` backpressure), ADR-0438
(oversize drop), ADR-0069 (wire image refs), ADR-0785/0786 (reassembly
bounds/TTL), ADR-1045 (answer-store), ADR-1049 (park rescan), ADR-1059
(superseded-link backlog reset).

## Context

An `imgq` request is answered by `_flushImgOuts`, which pushes the whole
blob — 64KiB `k:'img'` chunks — synchronously through `_bcast`. `_bcast`
dual-sends over BroadcastChannel and `_sendDC`. `_sendDC` first tries
`dc.send()`; once a send throws (SCTP buffer full) it parks every subsequent
message in `_dcQ` (bounded at 4096 messages / 32MiB of queued bytes) and
drains on `onbufferedamountlow`. Messages that exceed the bounds are
**silently discarded**.

## Problem

The img chunk stream bypassed that accounting completely:

- `_flushImgOuts` never consulted the queue state, so a blob answer fired
  into an armed/congested `_dcQ` kept pushing chunks until each one hit the
  byte cap and vanished.
- The receiving slot (`_imgChunks`, keyed `key|peer` since ADR-1038)
  requires the complete `n`-chunk series; losing tail chunks means the slot
  can never finish — it expires at the 60s TTL, then the receiving peer's
  5-min `_imgRescan` re-parks and re-requests the *whole* blob.
- Under a persistently slow link every answer dropped at the same point, so
  each rescan regenerated a doomed multi-MB transfer — a permanent, silent
  blob-starvation amplification loop (wasted uplink AND an unresolved
  placeholder).

## Decision

- `_flushImgOuts` mirrors the queue's own admission check before each chunk:
  when `_dcQ` is armed, defer instead of dropping once the backlog would
  exceed `4096` messages or `33554432+ε` bytes (`+256` approximates the
  serialized envelope over `data`). The unstarted remainder stays staged in
  `_imgOuts` via `outs.slice(i)` where `i` only advances past *completely*
  emitted blobs.
- The `onbufferedamountlow` drain — the single point where the backlog
  empties — resumes the staged outs after re-sending the queued messages.
- A partially-emitted blob is re-emitted from `seq:0`; the receiver's slot
  restarts on `seq:0` (ADR-1038 slot-restart), so the re-emission replaces
  rather than corrupts the partial assembly.

## Consequences

- Chunks are never silently dropped mid-stream: either they send now, or
  they ride the same drain the rest of the backlog uses. Ordered delivery
  within one DC is preserved (chunks re-enter `_sendDC` after the older
  backlog).
- Deferred puts remain in `_imgOuts` across the window; `Net.init` /
  `_wrtcInit` lifecycle resets (ADR-0464/1059) already clear them.
- The BC half is unaffected (fire-and-forget, no backpressure concept) —
  DC-only peers see the fix; BC-only peers were never lossy here.
- Behavioural coverage: 9 asserts (partial flush defers remainder; drain
  resumes and completes both streams; source pins for the budget gate and
  the drain-resume).

## Contract for new queued/staged producers

Any producer that stage-flushes a multi-message series through `_bcast`
MUST either (a) budget-check `_dcQ`/`_dcQB` before each send and defer its
remainder (this pattern), or (b) enqueue the series atomically so the
cap-drop boundary can't bisect it. A mid-series silent drop is a
convergence bug, not a performance choice.
