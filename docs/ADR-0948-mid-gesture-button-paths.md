# ADR-0948: Mid-gesture button/reachable paths cancel the live gesture too

## Status

Accepted (2026-10-01)

## Context

ADR-0634/0637/0574/0945 established the convention that opening an overlay or
running a command while `ptr.down` first cancels the gesture — otherwise the
captured pointer keeps dispatching to the canvas and the release commits an
invisible drag under the open surface, or a stale before-snapshot collides with
the command's mutation.

ADR-0945 covered the keyboard-opened overlays (`?` help, `⌘F` search). The
audit found four reachable paths that bypassed it: toolbar buttons and commands
a **second finger** (touch) or the other hand can invoke while the first
pointer still holds a drag. `setPointerCapture` retargets only the captured
pointer — other pointers keep normal hit-testing, so toolbar buttons stay live
mid-gesture.

- `UI.openShare()` — share modal opens under a live drag (0945 literal parity).
- `UI.openExportMenu()` → `openCtxMenu()` — ctx-style menu opens mid-gesture;
  the `contextmenu` event path cancels first (4491), the button path didn't.
- `btnUndo`/`btnRedo` → `Store.undo()/redo()` — the ⌘Z/⌘Y key path cancels
  (0574), the button path ran undo against a live drag's stale before-snapshot.
- Buttons that were checked and are safe: `btnPresent` (cancels inside
  `Presentation.enter`, 0634), `pgPrev/pgNext/pgAdd/pgDup/pgDel` (land through
  `switchPage`/`_pgAdopt`, which cancel), `btnLang/btnTheme` (repaint only),
  `btnExport` (draw-only, no state mutation), `btnFit/btnZoomIn/btnZoomOut`
  (wheel zoom mid-drag is already reachable — consistent), `btnInstall`.

## Decision — cancel inside the function, not at each call site

Add `if(ptr.down)_cancelPointerGesture()` at the top of:

- `UI.openShare()` — covers the button path *and* every future caller.
- `UI.openCtxMenu()` — covers `openExportMenu`, the contextmenu handler
  (redundant but idempotent), and any future menu-open path.
- `Store.undo()` / `Store.redo()` — covers buttons, keys (redundant), ctx-menu
  undo items, and every future caller. Function-side placement mirrors ADR-0945.

To stay under the raw ceiling, three comment tails (`_nameWin`/`_tAlive`/`_bN`)
were trimmed to their ADR refs and the ADR-0519 edge-pan block was compressed.

## Consequences

- Mid-gesture share/menu/undo/redo can no longer produce an invisible commit
  under an open surface or an undo against a stale gesture snapshot.
- test.mjs pins the three paths end-to-end: a live rect gesture is cancelled
  by `UI.openShare()` (dialog opens), `UI.openExportMenu()` (menu opens), and
  `Store.undo()` (undo still applies). +8 behavioural asserts (3028 → 3036).
