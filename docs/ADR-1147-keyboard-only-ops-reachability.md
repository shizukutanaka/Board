# ADR-1147 — keyboard-only ops reach the context menu (text flags + zoom-to-selection)

Status: Accepted (v1.8.171, round897)

## Context

ADR-0135's sweep established the rule: **an op reachable only through a
keyboard shortcut is invisible to touch/mouse users** — the exact trap
FT-06 warned about. Every such op must exist in the ctx menu (right-
click / long-press), the toolbar, or both.

A fresh sweep of the op surface found the last keyboard-only ops:

| op | keyboard | ctx item before | status |
|----|----------|-----------------|--------|
| bold | ⌘B | none | **gap** |
| italic | ⌘I | none | **gap** |
| underline | ⌘U | none | **gap** |
| strikethrough | ⌘⇧X | none | **gap** |
| zoom to selection | ⇧2 | none | **gap** |

Everything else already had a reach: undo/redo and the tool/theme toggles
live in the toolbar; every other selection op had a ctx item (align,
z-order, flip/rotate, group, hide/lock, conversions, exports, ...).

## Decision

Added five ctx items calling the **identical** functions the keys call:

```js
has&&_selTxtL()&&['ctxBold','⌘B',()=>toggleTextFlag('bold')],
has&&_selTxtL()&&['ctxItalic','⌘I',()=>toggleTextFlag('italic')],
has&&_selTxtL()&&['ctxUnder','⌘U',()=>toggleTextFlag('under')],
has&&_selTxtL()&&['ctxStrike','⌘⇧X',()=>toggleTextFlag('strike')],
has&&['ctxZoomSel','⇧2',zoomToSelection],
```

Gate choice: `_selTxtL()` — text/sticky/frame/labeled, unlocked — is the
same domain `_forTxt` writes over inside `toggleTextFlag`, so the menu
shows the item exactly when it would apply. `ctxZoomSel` gates on `has`
(selection non-empty), matching `zoomToSelection`'s own no-op domain.

Apply semantics are **shared, not forked**: the menu delegates to
`toggleTextFlag`, which keeps the style op, the per-shape skip-locked
rule, and `_nugPush` undo coalescing identical to the key path.

## Consequences

- Touch/mouse users can now reach every text modifier and selection-zoom.
- No new op paths: the five items are thin reach wrappers — no new
  apply logic to drift.
- i18n keys added to both locales (ja+en parity).

## Pins (8)

- Each item's menu row exists with the right key label and target fn.
- ja + en i18n keys exist.
- `toggleTextFlag('bold')` via the menu-called path touches the
  text-capable unlocked member only (sticky flags, rect skipped,
  locked text skipped).
