# ADR-0825: pin `_pk` viaRtc routing + rtc 'bye' peer-id clear

- Status: Accepted (2026-09-28, v1.7.851)

## Problem

ADR-0824 documented the dual-transport reality: `cursor`/`selection`/
`bye` ride the DataChannel, and `Net._pk(msg,viaRtc)` routes those
messages onto the synthetic `rtc:` presence row instead of the
sender's real id. Two behaviours carried the whole design but had no
behavioural pin:

- `viaRtc` → `_rtcPeerId`, BC → `msg.peer`. A future "tidy" folding
  `_pk` away would silently split an RTC peer into two presence rows
  (a synthetic one plus a phantom real-id row).
- RTC `bye` sets `_rtcPeerId=null` — losing that gate leaves the
  dead link's synthetic id armed, so late-arriving msgs on a reused
  id could re-possess a presence row.

## Fix

Test-only pin beside the ADR-0821/0822 RTC pins: assert `_pk` on
both transports and that `_onRecv({k:'bye'},true)` nulls
`_rtcPeerId`. No production code change.
