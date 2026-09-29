# ADR-0749: _pgAdopt re-validates the selection on page change

## Status
Accepted (2026-09-28)

## Context
`switchPage` keeps the invariant "selection ⊆ current page" by
re-running the `_ss` chokepoint (`_ss(_selIds())`) after the move —
`_ss` admits only ids whose shape is existing + visible + `_pgOk`.
`_pgAdopt` performed the same `curPg` transition on remote
`pageDel`/`replace`/snapshot intake but skipped the re-validation, so
selection could silently retain ids whose shapes are now off-page.

Consequence: shapes the user cannot see stay selected. A subsequent
Delete / move / style op still applies to them — invisible
destructive edits from the user's point of view.

## Decision
`_ss(_selIds())` inside the `nc!==oc` branch of `_pgAdopt`, next to
`Net.sendCursorHide()` — mirroring `switchPage`'s send-order (hide
first, then the state that re-derives presence). Same-page adopts
(`nc===oc`) cannot stale the selection: a selectable shape's `pg` was
already the surviving `curPg` or null, and neither changes side.

## Consequences
Selection is page-scoped on every transition path, local or remote.
1 behavioural assert pins the drop; the 0690 source pin was updated
to the new `{...}` form.
