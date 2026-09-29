# ADR-0720: 'replace' wire carries the landing page

## Status
Accepted (実装済)

## Context
`_apply` 'replace' calls `_pgAdopt(op.pages, op.curPg)` on the forward path —
the op is designed to carry the page the actor lands on. `_repC` records
`curPg:state.curPg` and `beforeCurPg` at commit (ADR-0646).

But `_slimOp` stripped `curPg` from the wire op, and `_undoWire` sent
`pages:op.beforePages` without `curPg:op.beforeCurPg`.

## Divergence
`_pgAdopt(pages, undefined)` resolves `cur` to `_pgById(undefined)` → falsy →
falls back to `pages[0].id` — **page 1 on every receiver**:

- Forward swap (share-link/import/reload): the sender lands on `op.curPg`
  (their own page, e.g. page 3); every peer lands on page 1 — cursor/page
  presence diverges silently.
- Undo of a swap: the local backward lands on `beforeCurPg`; peers land on
  page 1.

## Decision
Both wire paths carry the landing page:

- `_slimOp` 'replace': `pages:op.pages, curPg:op.curPg`.
- `_undoWire` 'replace': `pages:op.beforePages, curPg:op.beforeCurPg`.

`_pgAdopt` already tolerates a stale `curPg` (falls back to page 1 only when
the id is unknown), so no validation change is needed.

## Consequences
- Receivers land on the same page the actor landed on — presence (`pg`) agrees
  on every peer.
- Pin + two-peer behavioural test: remote replace with `curPg:'p2'` lands the
  receiver on p2.
