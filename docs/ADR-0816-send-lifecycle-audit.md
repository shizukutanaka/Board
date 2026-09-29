# ADR-0816: Send-path & lifecycle audit complete

- Status: Accepted (2026-09-28, v1.7.842)

## Scope & Result

Audited the wire *send* funnel and the room-switch / disconnect /
failure lifecycle — all paths already guarded; no fixes needed.

- `_sendDC` (the only dc egress): drops messages >256KiB outright
  (ADR-0438 — they can never cross SCTP); while a backpressure queue
  exists it is capped at 4096 messages AND 32MiB total bytes
  (`_dcQB`, ADR-0783); `dc.send` is try/caught and the failure path
  installs `onbufferedamountlow` to drain the queue — never
  overflows into unbounded retries.
- `_send` (BroadcastChannel): `bc.postMessage` try/caught.
- Queue lifecycle: `_dcQ`/`_dcQB`/`_snapIn`/`_opcIn` reset on both
  `dc.onclose` (ADR-0446/0448) and `connectionState==='failed'`
  (ADR-0385), so a dropped channel can't poison the next attempt.
- Room switch (`Net.init`): `_imgSent`/`_imgChunks`/`_imgOuts`/
  `_snapIn`/`_opcIn` cleared (ADR-0464/0466), presence heartbeat
  cleared before re-arming (no leaked interval), `_pCt` re-
  baselined (ADR-0467), non-rtc presence rows dropped (ADR-0458),
  causal markers reset only on a real room change (ADR-0619).
  `_imgIn`/`_imgInB` intentionally persist: blob keys are content
  hashes, so a retained entry is the same bytes a new room would
  resend anyway — keeping them is free dedup, and the store is
  byte-capped at 64MiB (ADR-0784).
- localStorage: every `_lg`/`_ls` read/write sits inside try —
  QuotaExceededError / storage-disabled environments degrade to
  defaults instead of killing boot (incl. `PEER_ID` init).
- `seenOps` is a Set and `validClock` bounds peer/seq/ts — no
  proto-key or unbounded-clock surface.

Conclusion: send funnel, queue lifecycle, storage, and clock intake
are complete — all bounds already pinned by ADR-0438/0446/0783/0779
and their tests.
