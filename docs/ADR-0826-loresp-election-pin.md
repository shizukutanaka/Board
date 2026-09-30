# ADR-0826: pin `_loResp` snapshot-responder election

- Status: Accepted (2026-09-28, v1.7.852)

## Problem

`_loResp(pk)` decides who answers a `hello`/`sync-req`: exactly the
lowest-id peer that is neither the asker (ADR-0465 — a minimum-id
joiner would otherwise get zero responders and starve) nor the
synthetic `rtc:` row (ADR-0455 — a DataChannel peer isn't in the BC
election at all). Three independent invariants in one expression; a
regression either starves joiners (nobody answers) or storms them
(everybody answers a broadcast request).

## Fix

Test-only pin: cover (a) election when only higher ids exist, (b)
loss when a lower id exists, (c) the asker-exclusion, and (d) live
`rtc:` row exclusion. No production change.
