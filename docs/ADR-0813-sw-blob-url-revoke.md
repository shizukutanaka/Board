# ADR-0813: Revoke the SW-registration blob URL

- Status: Accepted (2026-09-28, v1.7.839)

## Decision

Every `_oURL` call site must release its object URL: download anchors
via `_rO` (10s deferred revoke), the print window via a 30s revoke.
The service-worker registration URL was the one exception — it leaked
one blob per page load. `register()` only needs the URL until
registration settles, so we now revoke it on both outcomes (a
`.then(f,f)` pair keeps the success/failure paths identical without
needing `finally`).
