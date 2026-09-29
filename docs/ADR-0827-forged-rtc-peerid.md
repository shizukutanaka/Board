# ADR-0827: reject forged `rtc:` peer ids on the BC path

- Status: Accepted (2026-09-28, v1.7.853)

## Problem

`_reapPeers` exempts `rtc:`-prefixed rows (8492) because real RTC
presence is lifecycle-managed by the DataChannel, not the BC
heartbeat. But the exemption matched the *prefix*, not the
*provenance*: a BroadcastChannel message could claim
`peer:'rtc:evil'` — intake only checked string/≤64 — and
`_touchPeer` would install a row the reaper skips forever. A forged
row is a permanent phantom presence and permanently occupies a
MAX_PEERS slot; a script could fill all 32 slots with un-reapable
`rtc:` ghosts.

Legit traffic is unaffected: RTC msgs carry the remote's real
`_pi()` (never `rtc:`); synthetic `rtc:` ids are generated locally
at `dc.onopen` and routed by `_pk` only when `viaRtc`.

## Fix

One clause in `_onRecv`'s peer-id validation:
`||(!viaRtc&&_sw(msg.peer,'rtc:'))` — reject `rtc:` ids unless the
message really came over the DataChannel. Behavioural pin added.
