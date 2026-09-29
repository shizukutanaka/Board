# ADR-0750: _pgAdopt announces the adopted page to screen readers

## Status
Accepted (2026-09-28)

## Context
`switchPage` ends with `_ann(_pgById(id).name)` so a screen-reader
user hears which page they landed on. `_pgAdopt` performs the same
`curPg` transition on remote `pageDel`, `replace` intake, and
snapshots — but never announced. An SR user's content silently
swapped under them; ADR-0649's own comment described the landing
path as "the page change is announced", which was only true on the
local route.

## Decision
`if(nc)_ann(_pgById(nc).name)` inside the `nc!==oc` branch, after
the selection re-validation — same announce text as `switchPage`
(the adopted page's name). The `nc` guard covers adopts that drop
the page set entirely (`pages:null`), where there is nothing to
name.

## Consequences
Every page transition — local tab/keyboard, remote delete, import,
snapshot — now announces the landing page identically. Source pin
updated to the new `nc!==oc` branch form.
