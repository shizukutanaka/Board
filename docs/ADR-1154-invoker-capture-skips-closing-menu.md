# ADR-1154 — invoker capture skips elements inside the closing ctx menu

## Status
Accepted — implemented in v1.8.178 (round904).

## Context
ADR-1150..1153 gave every transient overlay the same focus contract:
capture the invoker on open, restore it on close while the overlay still
holds focus, fall back to `canvas` when the invoker is gone.

The ctx-search path silently violated it:

1. `openCtxMenu` captures the real invoker into `UI._prevFocus` (closed→
   open only) and focuses the first `.ctx-item`.
2. Clicking `ctxSearch` runs `fn()` *before* `closeCtxMenu()` —
   `toggleSq()` sees `open===true` and captures `_sqPrev = _aE()`,
   which is the focused `.ctx-item` button.
3. `closeCtxMenu` hides the menu. The item stays in the DOM
   (`isConnected===true`) but is `display:none` — unfocusable.
4. Esc in the find box folds it; the restore targets `_sqPrev` — the
   dead menu item. `HTMLElement.focus()` on a non-rendered element is a
   no-op, so `activeElement` falls to `<body>` — exactly the stranded
   focus the contract exists to prevent, and the `isConnected!==false`
   fallback cannot see it because the element is still connected.

## Audit
All three invoker slots were checked for the same reachability:

- `UI._prevFocus` — captured on `dataset.open!=='true'` only; focus
  cannot sit inside a `display:none` menu at capture time. Clean.
- `_edPrev` (text/label editors) — every caller audited:
  `editSelectedShapeKbd` (Enter key), `openLabelEditor` (dblclick,
  `_lblAnchor`-gated label path), `openTextEditor` (dblclick, stamp,
  sticky chain, `_openLabelEditorFor`, Tab chains). **No ctx-menu item
  opens an editor**, and the export menu's custom items are export ops.
  The sq path itself cannot arm `_edPrev` — search never opens an
  editor (⌘Enter selects matches). Clean.
- `_sqPrev` — the only ctx→overlay transition in the app: `ctxSearch`.

Also verified: `_captureFocus` inside `openCtxMenu` re-runs only on a
fresh open (re-opened menus keep the first invoker), so a chained
`toggleSq` records the menu's *original* invoker, not a stale dialog's.

## Decision
When the captured element sits inside the ctx menu, record the menu's
own recorded invoker instead:

```js
if(open){const e=_aE(),m=_g('ctx');_sqPrev=e&&m.contains(e)?UI._prevFocus:e}
```

The menu item "stood in for" the real invoker — restoring to the
element that opened the menu is the correct semantic, and `UI._prevFocus`
is guaranteed non-null here (capture ran on the closed→open transition).

The fold's `isConnected!==false` fallback is unchanged: a recorded
invoker that dies later (removed toast, torn-down peer avatar) still
lands on `canvas`.

## Consequence
- `.ctx-item` (or any element inside `#ctx`) can never be recorded as an
  invoker. If another ctx→overlay item is added later (e.g. a future
  editor item), this ADR's rule must be applied to that capture too —
  currently only `_sqPrev` needs it because only `ctxSearch` exists.
- Behavioural pins cover the real order: open menu → item focused →
  `toggleSq` → Esc fold lands on the menu's invoker, never the item.
