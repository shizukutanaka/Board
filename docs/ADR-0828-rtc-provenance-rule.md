# ADR-0828: document the `rtc:` row provenance rule

- Status: Accepted (2026-09-28, v1.7.854)

## Problem

The `rtc:` presence row lifecycle is split across three sites that
must agree: `dcRef._pid` creation (0822), `_pk` routing (0825), the
`_reapPeers` exemption, and now the `_onRecv` forge guard (0827).
architecture.md described the exemption but not the provenance rule
that makes it safe — the next reader could re-derive the hole
(rejecting all `rtc:` ids would break the live link; exempting all
reopens the forge).

## Fix

Docs-only: one bullet in the presence lifecycle section stating the
invariant — synthetic `rtc:` ids are created only by our own
`dc.onopen`, routed only when `viaRtc`, and rejected on every other
path. No code change.
