# ADR-1153 — editor overlays join the focus contract

## Status
Accepted — implemented in v1.8.177 (round903).

## Context
ADR-1150/1151 gave the ctx menu and the find box a proper focus contract
(capture invoker on open → restore on close). The two remaining
focus-stealing overlays were the inline editors — the *most* opened
overlays in the app:

- `openTextEditor` (text/sticky editing, `_teTa`)
- `openLabelEditor` (box/connector label editing, `_lblTa.inp`)

Neither captured an invoker, and every fold path ended in a bare `_rm(el)`:

1. text blur commit — orphaned shape (`byId`/`_lk` guard)
2. text blur commit — normal end
3. label blur commit — orphaned
4. label blur commit — normal end
5. label Esc — removes the element **while still focused**
   (`removeEventListener('blur',commit)` then `_rm(inp)`)
6. `_lblFollow` teardown (remote delete/hide/lock/off-page/ro — ADR-1103)
7. `_teFollow` teardown (same gates)

Removing a focused element leaves `document.activeElement` on `<body>` —
keyboard users kept their window-level shortcuts (the router is global)
but lost the document's focus context entirely: screen-reader focus has no
anchor, and `<body>` is not a meaningful landing spot in an editor whose
"document" is the canvas. This is the same defect class ADR-1150/1151
closed for the ctx menu and the find box.

## Decision
Both openers capture the invoker on open into a shared `_edPrev` slot —
right after `_cxO()`, so a chained editor records the *restored* focus of
the previous editor's fold (which is canvas, its true invoker).

All seven removal sites route through `_foldOv(el)`:

```js
const _foldOv=el=>{const had=_aE()===el;_rm(el);
  if(had||_aE()===_db)_fc(_edPrev&&_edPrev.focus&&_edPrev.isConnected!==false?_edPrev:canvas);
  _edPrev=null};
```

Two triggering conditions cover the two temporalities:

- `had` — non-blur removals while the element still holds focus (label Esc,
  remote teardowns). Focus is checked *before* `_rm`, since removal is what
  strands it on `<body>`.
- `_aE()===_db` — blur-path removals: during a `blur` handler
  `activeElement` has *already* moved; `body` means the focus had nowhere
  to go and the invoker must take it back.

Two non-negotiable asymmetries:

- **Never steal a real target**: a blur that moved focus to a real element
  (a button click, a menu item) leaves it alone — `had` false and
  `_aE()` is that element, not `_db`.
- **Detached invokers fall back to `canvas`** — same
  `isConnected===false?canvas:p` pattern as `_restoreFocus` (ADR-0982).

The slot is shared across the two editors because `_cxO` keeps them
mutually exclusive; each fold nulls it ("closed ⇒ slot null", same
invariant as `_sqPrev`).

## Consequences
- Every fold — Esc, Enter, blur commit, Tab-chain end, remote
  delete/hide/lock/off-page/ro — lands focus on the invoker (canvas in
  almost every real flow), never `<body>`.
- Tab chains are unaffected: `_cxO` → previous fold restores → next opener
  re-captures the restored focus.
- Presentation enter / page switch / `_pgAdopt` folds inherit the contract
  for free since they funnel through the same teardown paths.

## Tests
7 pins: 2 source (helper + both capture sites + all seven `_foldOv` call
sites) + 5 behavioural — blur→body restores the invoker, body/null
invoker falls back to `canvas`, blur→real-element is never stolen, label
Esc (removal while focused) restores, and `_teFollow`-path teardown while
focused restores.
