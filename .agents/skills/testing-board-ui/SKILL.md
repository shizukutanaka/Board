---
name: testing-board-ui
description: How to E2E-test the Board single-file whiteboard app (index.html) in Chrome on macOS — coordinates, tool map, ground-truth extraction, real-input fallback, and known pitfalls.
---

# Testing Board (index.html) in a real browser

Board is a single-file offline whiteboard. Open `file:///Users/devin/repos/Board/index.html` directly in Chrome — no server, no deps. State persists in IndexedDB, so **clean up test shapes at the end** (Cmd+A, Backspace) or the user's real board stays polluted.

## Coordinate system

- Computer-tool space is 1024x768; the real display is ~1600x1200 (scale ~1.56).
- Maximize Chrome first: `osascript -e 'tell application "Google Chrome" to set bounds of front window to {0,30,1600,1118}'`.
- Left toolbar is a ~33px-wide strip (x≈0–33 in tool space). Buttons are ~15px apart — **verify the active tool visually (teal highlight) after clicking**; adjacent buttons are easy to miss by a few px.
- Canvas occupies roughly x 33–1017, y 140–705. Status bar at bottom-left shows `Shapes N` and world `x,y` — use it to confirm clicks landed and to measure pan distance.

## Tool shortcuts (KEYMAP in index.html, ~line 5599)

Letters only: `v`=select `h`=hand `p`=pen `r`=rect `o`=ellipse `i`=eyedropper `a`=arrow `l`=line `t`=text `n`=sticky `f`=frame `e`=eraser `d`=diamond `k`=marker. Digit keys set opacity (no tool switching). `cmd` maps to Command; `super` does NOT.

## Behavior gotchas that look like bugs but aren't

- `endRectLike` auto-switches back to select after each draw — press `r` again for each new rect.
- Box tools also **click-stamp** a default 120x80 shape (ADR-0086) — a bare click leaves a shape.
- Unfilled rects hit-test only on the border band, not the interior — click the edge to select, or use marquee (bbox containment).
- Quick-connect dots require select tool + hover + not pointer-down — for unfilled shapes hover registers only on the border.
- Tool primitive gotchas: `left_mouse_down`/`left_mouse_up` take NO coordinate — `mouse_move` first, then down/up. `left_click_drag` exists but explicit down/move/up is more reliable for held-drag tests (edge-pan).

## Ground truth without CDP (no browser_console)

Chrome here lacks `--remote-debugging-port`, so `browser_console`/`read_dom` don't work. Use:

1. **Clipboard JSON export** — Cmd+A selects all, Cmd+C writes a `.board` JSON to the OS clipboard:
   `osascript -e 'the clipboard as «class utf8»' | python3 -c 'import sys,json;print([(s.get("type"),s.get("text")) for s in json.loads(sys.stdin.read())["shapes"]])'`
   This gives exact stored shape data — the decisive check when rendering is ambiguous.
2. **Console errors** — Cmd+Opt+J opens DevTools docked; screenshot it. Expect ONE benign error on file://: "Unsafe attempt to load URL ... 'file:' URLs are treated as unique security origins" (service worker can't register on file://).
3. **Real OS input** — if the tool's `type`/`click` is suspect (e.g. to prove a bug isn't a synthetic-event artifact), post real events via Swift CGEvent: `CGEvent(keyboardEventSource:src,virtualKey:0,keyDown:)` + `keyboardSetUnicodeString(stringLength:unicodeString:)` for text; `CGEvent(mouseEvent:...)` for clicks. Proven working.
4. **Image-paste testing** — put a PNG on the OS clipboard then Cmd+V in the page:
   `osascript -e 'set the clipboard to (read (POSIX file "/tmp/x.png") as «class PNGf»)'`
   Generate a >16MB PNG for the cap test with a Python/Pillow-free trick: `python3 -c` writing random-pixel raw PNG via zlib, or just scale up with sips until the file exceeds ~12MB (data URL inflates ~4/3).

## Previously-found bugs (fixed — regressions to re-verify if they resurface)

- ~~Idle right-click never opens the context menu on macOS~~ — fixed in ADR-0532 (right-button `pointerdown` returns before arming `ptr.down`). If the menu stops opening again, check that `if(e.button===2)return` still precedes `ptr.down=true`.
- ~~New text/sticky commits lose typed text~~ — fixed in ADR-0533 (`openTextEditor` resolves `byId(s.id)` — the live shape, not the pre-clone). If fresh text disappears again, check for a new caller bypassing that re-resolution.
- Synthetic keypresses/clicks occasionally drop — verify state visually between steps rather than trusting batched actions.

## More selection/menu gotchas (observed v1.7.579)

- **Locked shapes are excluded from marquee selection** (ADR-0127) and from clipboard export (`doCopy` filters `!_lk`) — use Cmd+A (selects all visible incl. locked) to grab a locked shape, and rely on the status-bar `Shapes N` count rather than clipboard JSON to detect duplicates involving locked shapes.
- The ctx menu is **selection-based**: right-click does NOT select — left-click the shape's border first, then right-click, or Lock/Delete items won't appear.
- With a selection the ctx menu is **taller than a 768px viewport** — it clamps at the bottom and its top items (Copy/Paste/Delete…) clip off-screen. Right-click lower on the canvas or scroll.
- ADR-0541 ctx-menu key dismiss **closes the menu but the key still bubbles to canvas shortcuts** — 'v' switches tools, Backspace deletes the selected shape. Verify intent before assuming keys are swallowed.
