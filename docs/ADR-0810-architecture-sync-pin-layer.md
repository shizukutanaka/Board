# ADR-0810: Architecture sync — clamp pin layer + transport parity

- Status: Accepted (2026-09-28, v1.7.836)

## Decision

Sync `architecture.md`'s viewport section to the completed pin layer:
all write forms audited (literal `_vp().x=`, saved-reference `v.x=`,
`+=`), and every interactive accumulator carries a behavioural pin
(arrow keys 0802, wheel pan + ctrl+wheel zoomAt 0805, `_edgePanTick`
0808, hand-tool drag 0809) plus the `>=16` site-count pin.

Also recorded from the same audit: BroadcastChannel and RTC
DataChannel share a single `_onRecv` path (no transport-specific
validation hole), and peers are anonymous — no `name` field is stored
on peer objects, so presence has no string-length attack surface.
