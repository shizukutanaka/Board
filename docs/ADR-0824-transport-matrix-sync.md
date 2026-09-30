# ADR-0824: sync architecture.md's transport×kind matrix to the code

- Status: Accepted (2026-09-28, v1.7.850)

## Problem

The wire-protocol section claimed
`hello`/`sync-req`/`ping`/`cursor`/`selection`/`name` are
"BroadcastChannel 経路のみ". The code disagreed in both directions:

- `cursor`/`selection`/`name` send via `_bcast` (`_send` + `_sendDC`)
  — they DO ride the DataChannel; that's the whole reason
  `_pk(msg,viaRtc)` routes them onto the synthetic `rtc:` row.
- `bye` uses `_bcast` on pagehide (ADR-0456 — an RTC peer's bye must
  drop its presence row immediately, not wait for a reap).
- `img` chunks use `_bcast` too — blob bytes flow over both
  transports.
- `op` is dual via a bespoke branch inside `broadcast()` (BC raw
  envelope + dc `opc`-fragmented), not the literal `_bcast` fold.
- `snapshot` is dual: raw object on BC, `snap` fragments on dc.

Only `hello`/`sync-req`/`ping` are genuinely BC-only (the RTC link
has no presence heartbeat — it is lifecycle-managed via dc events).

## Fix

Docs-only correction of the transport matrix in architecture.md.
No code change — the audited behaviour is the intended design.
