# ADR-1174: snapshot union-heal re-derives a cap-dropped `curPg`

## Status
Accepted (v1.8.198). Supersedes nothing; extends ADR-0773 (union-heal merge) and
ADR-0649/0725 (`_pgDel2` landing via `switchPage`).

## Context
A `k:'snapshot'` message on an already-paged board merges `msg.pages` into
`state.pages` as a union: incoming pages win order (ADR-0773), same-id pages
merge names via `nts` LWW (ADR-0681) and birth clocks, tomb-filtered or
over-cap pages are skipped (`_ln(np)<64`), then leftover local pages append.

The audit question: does every state the merge can produce still satisfy the
`_pgOk` invariant — `curPg ∈ state.pages` whenever pages exist?

`_pgAdopt` (fresh-adopt path, empty local set) already re-derives the view:
`nc = pages[0].id` when `cur` isn't in the adopted set. The union branch did
not. The 64-page cap makes the corner real: an incoming set filling the cap
drops every local-only page — including the one `curPg` points at. `curPg`
then references a dead id: `_pgOk` is false for **every** member (a pg-less
member falls back to `pages[0].id`, which still ≠ the stale id) → the whole
board renders empty while all data is intact — invisible-board divergence,
silent (no toast, no crash). `_pgHealS` cannot repair it: it only re-adds a
`'?'` stub when `np<64` **and** a member references the missing page — the
page's own members keep `pg=dead-id` so they stay invisible anyway.

## Decision
After `state.pages=np`, re-derive the view with the same rule `_pgAdopt` uses:
if `curPg` no longer resolves, land on `np[0].id` via `switchPage` (full
side-effect set — gesture fold, cursorHide, selection revalidation, SR
announce, persist schedule — the `_pgDel2` landing idiom). The `else
curPg=null` branch is defensive for an empty `np` (unreachable today: local
leftovers always supply ≥1 entry — kept so the invariant is stated, not
assumed).

## Consequences
- `curPg` is post-merge always a member of `state.pages` (or null when the
  set is null/empty — same contract every other producer maintains).
- No order/merge semantics change: only the previously-undefined view state.
- Symmetric with `_pgAdopt` and `_pgDel2` — third site, same landing rule.

## Pins
- 4 behavioural asserts: 64-page incoming snapshot drops the viewed local
  page → `curPg` re-derives to `pa0`; a `pg:'pa0'` member stays `_pgOk`.
- 1 source assert: the re-derivation guard literal.
