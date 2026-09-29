# ADR-0748: _pgAdopt invalidates _gridVer-keyed caches

## Status
Accepted (2026-09-28)

## Context
`_pgAdopt(pages, cur)` installs a page set and resolves the viewed
page (`state.curPg`), e.g. after a remote `pageDel` of the page being
viewed, a `replace`/snapshot adopt, or an import. It cancelled live
gestures and hid the cursor, but never bumped `_gridVer`. Several
caches are keyed on `_gridVer` while embedding **page-filtered**
results:

- `_sqList` (search matches) — filters `_pgOk(s)` at build time
- `_grpMapGet` (group halo) — same membership filter
- minimap scene / DOM mirror — page-scoped content

After a silent `curPg` or membership change the caches kept serving
the OLD page's results: Enter-navigation could select an off-page
shape, and the overlay drew phantom match/halo rects where nothing
is visible.

## Decision
`_iG()` at the end of `_pgAdopt`. Callers are all infrequent (remote
ops, snapshot, imports) — the one-time grid/index rebuild is cheap
relative to the adopt itself. `switchPage` already invalidated;
`_pgAdopt` was the unpaired sibling.

## Consequences
Page-filtered caches can no longer outlive the adoption that changed
the page. 4 behavioural asserts pin the rebuilt match list.
