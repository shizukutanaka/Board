# ADR-1155: an invoker inside a dying overlay is never recorded

## Status

Accepted (v1.8.179) — extends ADR-1150/1151/1153/1154.

## Context

Every transient overlay records its invoker so focus can return on close:

| Overlay | Slot | Capture site |
|---|---|---|
| ctx menu / help / share | `UI._prevFocus` (shared) | `_captureFocus()` |
| find box | `_sqPrev` | `toggleSq` open branch |
| text/label editors | `_edPrev` | `openTextEditor`/`openLabelEditor` |

ADR-1154 fixed `_sqPrev` recording a `.ctx-item` (an element that dies with
the menu) via a `m.contains(e) → UI._prevFocus` substitution. The shared
`_prevFocus` slot has the same defect shape in both directions:

- **Dialog steals the menu's invoker.** With the ctx menu open, a second
  overlay's `_captureFocus()` runs while a `.ctx-item` is focused → the
  menu's armed invoker is clobbered by an element that dies with the menu.
  The unwind chain then restores focus to the dead item → `<body>` strand.
- **Menu steals a dialog's invoker.** `openCtxMenu` over a modal dialog
  records a dialog child (dying on that dialog's close) — the dialog's own
  restore chain is decapitated, and a floating menu over a modal is a
  broken UI anyway.

A reachability audit shows today's entry points can't trip either path
(`_ctxMenuKeyNav` swallows `?`; `_openDialog` + the `inset:0` backdrop
block every keyboard and pointer route; document-mousedown always closes
the menu before a toolbar click). But the contract is one future caller
away from breaking — the class must be closed at the chokepoint, not at
each caller.

## Decision

1. `_dyingH(e)` — the dying-host predicate next to `_openDialog`: true when
   `e` sits inside `#ctx` or inside an open `.help-overlay`. Those hosts
   are the only overlays whose children vanish with them.
2. `_captureFocus()` skips recording when `_aE()` is a dying host's child —
   the already-armed invoker (the element the dying host itself stood in
   for) is kept, so the outer overlay inherits the *real* restore target.
3. `openCtxMenu` early-returns while `_openDialog()` reports a modal — a
   menu never floats over a dialog, so it can never record a dying child.
4. `toggleSq` replaces its `m.contains(e)` literal with `_dyingH(e)` —
   the ADR-1154 rule generalised to dialog interiors (same substitution:
   `UI._prevFocus`, the shared slot = the dialog's armed invoker).

The editors' `_edPrev` is left unchanged: every editor-open path
(dblclick, Enter, sticky chain) is unreachable while the menu or a dialog
is open — Enter inside the menu natively runs the focused *item* (APG),
and no editor item exists. Adding the guard there would record nothing.

## Consequences

- Two-step unwind chains now converge on the real invoker from either
  direction: menu→dialog restores the invoker the menu stood in for;
  dialog→menu is refused outright.
- The shared slot can still hold an armed-but-stale element between a
  menu close (contains-gate skip) and the next capture — harmless: every
  capture path either records a live element or re-arms on the next open.
- 10 behavioural pins (menu-refused-over-modal, capture-skip in both
  directions, `_dyingH` predicate existence, `_sqPrev` inside dialogs,
  real-invoker restore) plus the recalibrated ADR-1154 source pin.
