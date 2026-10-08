# ADR-1157: the find box folds before a modal / presentation opens

Status: accepted (v1.8.181)

## Context

ADR-1155 closed the menu→modal direction: `openCtxMenu` refuses to open while a
dialog is up, so a menu can never float over a modal. The find box (`#sqinput`,
created at `z-index:999`) had the inverse hole — nothing folded it when a modal
or the presentation opened:

- `.help-overlay` modals sit at `z-index:100`, so an open find box **renders
  above** the `#share`/`#help` dialog it was never meant to outlive.
- `Presentation.enter` covers the screen at `z-index:9000`, hiding the still-open
  box — which then **pops back mid-screen** on `leave()` with a stale query.

Reachability audit (both directions):

- sq → modal: `btnShare`/`btnHelp` are always pointer-reachable and their
  handlers (`UI.openShare`, `UI.toggleHelp`) never touched `sqinput`. The
  keyboard routes (`?`, ⌘F) are correctly gated by `_openDialog()`, but the
  buttons are not.
- sq → presentation: `btnPresent` / ⇧P with focus outside the input calls
  `Presentation.enter`, which folded only the editors (`_cxO`) and the ctx menu
  (implicitly via pointerdown outside).
- modal → sq: unreachable (⌘F gated by the router; `ctxSearch`'s menu is
  refused over a modal) — the asymmetry was exactly this hole.

Secondary wrinkle: with the box left open, `_captureFocus`/`_focusTrigger`
recorded `sqinput` itself as the invoker — so closing the modal returned focus
to a search box whose layer ordering was already broken.

## Fix

One seam, three call sites. `_foldSq` folds the box only if it is displayed:

```js
const _foldSq=()=>{const s=_g('sqinput');if(s&&s.style.display!=='none')toggleSq()};
```

called **before** the invoker capture at each overlay entry:

- `UI.openShare` — before `this._captureFocus()`;
- `UI.toggleHelp` (open branch) — before `this._captureFocus()`;
- `Presentation.enter` — before `_focusTrigger=_aE()`.

The ordering matters: folding first lets `toggleSq`'s own close path restore
focus to `_sqPrev` (the pre-search invoker), so the modal's `_captureFocus` then
records the *true* chain end instead of the search box. Closing the modal later
lands the user back where they stood before ⌘F — not inside a dead input.

With the find box gone from the z-stack, "one transient overlay at a time" now
holds symmetric: a menu refuses over a modal (ADR-1155), a modal refuses nothing
because the only overlay it could meet is folded on entry.

## Pins (test.mjs, 7 asserts)

- Source: `_foldSq` is a single helper; all three sites call it before the
  invoker capture (`_captureFocus` ×2, `_focusTrigger` ×1).
- Behavioural: `sqinput` open + focused → `UI.toggleHelp()` folds the box,
  clears the query, and the modal still opens.
