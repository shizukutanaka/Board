# ADR-0821: behavioural pin — `rtc:` presence survives a room switch

- Status: Accepted (2026-09-28, v1.7.847)

## Context

ADR-0820's lifecycle audit concluded that `Net.init` *deliberately*
preserves `rtc:` presence rows across a BroadcastChannel room
switch: the WebRTC data channel is a manual 1:1 invite pair,
independent of the room, so the link must not be dropped when the
user changes rooms. The `_pr()` sweep in `init` skips `_sw(id,'rtc:')`
rows and only clears BC presence.

That behaviour is subtle — a future "cleanup" that sweeps all rows
would silently break live RTC pairs — so pin it.

## Pin

`Net.init('roomB')` with `rtc:xyz` + `peerQ` seeded: asserts the
`rtc:` row survives and the BC-only row is dropped. BroadcastChannel
is stubbed in the harness; `init` runs end-to-end.

Test-only change — zero index.html bytes.
