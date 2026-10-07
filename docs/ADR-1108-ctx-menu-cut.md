# ADR-1108 — Context-menu Cut item (clipboard reachability)

## Status
Accepted — implemented (v1.8.132, round858).

## Context
ADR-0135 established the rule that every keyboard-only operation must also be
reachable from the context menu (mouse/touch users can't discover ⌘-shortcuts).
ADR-1107 just closed the OS-menu copy/cut dead path. Auditing the clipboard
gesture axis end-to-end showed one residual gap on the same axis:

- **OS-menu gestures** — Copy/Cut fixed in ADR-1107; Paste is event-driven on
  `e.clipboardData.items` (image → import, `image/svg+xml` → vector shapes,
  `text/plain` → `_textCascade` → `.board` echo → `doPaste()`) with no
  capture-flag dependency. Clean.
- **`contextmenu`** — opens the real ctx menu after cancelling a live gesture
  (`_pA` guard for presentation). Clean.
- **ctx menu items** — Copy / Paste / PasteAt / PasteInPlace / Duplicate /
  Delete / CopyStyle / PasteStyle are all present. **Cut was missing** — the
  only clipboard mutation that required the keyboard. ⌘X is also the only
  cut path an iPad-without-keyboard user can't reach, and `Copy`+`Delete` as a
  manual composition is undiscoverable.

## Decision
Add `ctxCut` to the selection-gated block, placed before `ctxCopy` (standard
Cut→Copy→Paste order):

```js
has&&['ctxCut','⌘X',()=>{doCopy();_cpNow=false;doDelete()}]
```

- `doCopy()` captures the selection into `state.clipboard` and sets `_cpNow`
  — but a menu click fires **no** `copy`/`cut` event, so the flag would be
  stale-consumed by the next OS gesture (the exact leak ADR-1107 fixed for
  `ctxCopy`). Same `_cpNow=false` drain, immediately after the capture.
- `doDelete()` runs last — under `state.ro` the copy lands and the delete is
  gated by the ro funnel, matching ⌘X and OS-menu Cut semantics.
- i18n keys `ctxCut` added for ja (`カット`) and en (`Cut`).

## Consequences
- Clipboard ops are now uniformly reachable: key (⌘C/X/V/⇧V), OS Edit menu,
  and ctx menu all carry Copy/Cut/Paste/PasteInPlace.
- The keyboard-only-op → ctx-menu rule (ADR-0135) has no remaining clipboard
  violations.
- Size cost ~140B, offset by a comment-tail reclaim in the same commit.

## Rejected alternatives
- **Leave it out** (Copy+Delete is two clicks): fails the ADR-0135
  reachability rule; touch users have no discoverable cut.
- **`navigator.clipboard`-driven Cut/Paste ctx items**: requires permission
  prompts and async reads; the app's internal `state.clipboard` model keeps
  ctx paste items gated on `_cl()` — OS-clipboard reads stay on the `paste`
  event path by design.
