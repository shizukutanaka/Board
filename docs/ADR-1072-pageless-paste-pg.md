# ADR-1072 — ページなしドキュメントへのペーストで外部 `s.pg` を落とす

## Status
Accepted (v1.8.095, round821)

## Context

`_placeCopies` remaps ids/groupIds/bindings for every paste/duplicate/import-merge
path. Page attribution was handled by one clause:

```
if(_pgs())sh.pg=state.curPg;   // ADR-0646: paste lands on the current page
```

When the destination doc has **no pages** (`state.pages===null`), the `if` is
false and `sh.pg` keeps whatever the source shape carried. A `.board` copied or
merge-imported from a multi-page doc therefore lands copies whose `pg` names a
page that does not exist here — `_pgOk(s)` is false on every page, so the shape
is invisible, unhittable, and absent from the DOM mirror. It still commits via
`addMany`, so peers adopt the same invisible shape: silent loss on both sides.

## Reproduction (pre-fix)

```js
state.pages=null;state.curPg=null;
_placeCopies([{id:'s',type:'rect',pg:'foreignPg',...}],0,0)[0];
// landed shape kept pg:'foreignPg' → _pgOk(s)===false → invisible
```

## Decision

```
if(_pgs())sh.pg=state.curPg;else delete sh.pg;
```

- Page-ful destination: unchanged — every copy lands on the viewed page
  (ADR-0646), matching the "paste into what I see" rule.
- Page-less destination: the foreign `pg` is deleted, so the copy renders like
  any page-less shape.
- Export/undo/wire paths need no change: `delete` removes the key, so the op
  serializes without `pg` and remote peers resolve identically.

## Consequences

- All four `_placeCopies` callers (paste, duplicate, smart-duplicate chain,
  import merge) inherit the fix.
- A multi-page source merged into a page-ful doc still collapses all pages into
  the viewed page — that was already the ADR-0646 contract and stays.
- Pin: test asserts the copy is dropped into visibility (pg removed) on a
  page-less doc and lands on `curPg` on a page-ful doc, plus a source pin on
  `else delete sh.pg`.

## Rejected alternatives

- **Rehome to a synthesized '?' stub page** — the wire-side heal already does
  this for unknown `s.pg`, but on a page-less doc there is no page bar to show
  it; the pasted content would still be hidden behind a phantom page. Deleting
  is the honest interpretation of "merge into this doc".
- **Import pages with the merge** — page import would change `state.pages`,
  needs tab-bar/undo cross-talk, and surprises the user with structure they
  did not ask for. Out of scope for a merge.
