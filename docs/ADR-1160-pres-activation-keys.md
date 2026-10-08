# ADR-1160 — The activation-key contract covers presentation mode

## Status

Accepted (round910, v1.8.184). Builds on ADR-1159.

## Context

ADR-1159 added a one-line guard to the global keydown router so a focused
`<button>` owns its activation keys: Enter/Space on a focused button must
activate the button, not the canvas action routed underneath it. The guard
was placed *after* the presentation-mode branch — so inside `_pA()` it
never ran.

That ordering left a same-class defect live in pres mode. During a
presentation the exit button (`✕ Esc`) is the *only* interactive control
left in the DOM, and it is focusable (pointer mousedown leaves focus on it;
screen-reader virtual cursors reach it too). Pressing **Space** on the
focused exit button:

1. hit the `_pA()` branch, where `k===' '` is a **navigation** key →
   `_pd(e)` suppressed the button's native click **and** `Presentation.next()`
   advanced the slide.

So Space on the focused exit button never fired `leave()` — it advanced
the deck instead. Enter was already consistent: it is not a pres nav key,
so the router returned without `_pd` and the native click fired `leave()`
either way. Space was the single asymmetric key.

## Decision

Hoist the ADR-1159 guard above the `_pA()` branch — no new code, just a
relocation, with the comment updated to cite both ADRs:

```js
const meta=_mod(e);
const k=_lc(e.key);
// ADR-1159/1160: a focused control owns its activation keys — Enter/Space on
// a button activates the button, not the routed action underneath.
if(e.target.matches?.('button')&&(k===_EN||k===' '))return;
if(_pA()){ /* nav keys */ return; }
const _dlg=_openDialog();
if(_dlg&&k!==_ES){ /* trap */ return; }
if(e.repeat){/*…*/}
```

The contract is now uniform: **a focused control owns Enter/Space in every
mode** — top level, presentation, dialogs (buttons inside a modal are still
swallowed earlier by `_dlg`, which is correct since the trap owns Tab).

Under pres, a button-target Space now early-returns → the native click
fires `leave()`. A non-button-target Space still navigates forward —
unchanged.

## Consequences

- Reachability: the scenario needs focus on the exit button — pointer
  mousedown-then-drag-off, or a screen-reader virtual cursor. Narrow, but
  the press produced the *wrong* action, not none.
- The v1.6.71 pres-guard source pin's distance bound still holds: the
  gap between `_pA()`'s closing brace and `meta&&k==='z'` shrank.
- The ADR-1159 ordering pin was recalibrated: the guard now precedes the
  pres branch (ahead of every routed branch), not the dialog trap.
- 5 new pins: guard position, Space/Enter on a pres-focused button leaves
  the viewport at frame 0, Space off-control still advances (non-vacuity).
- Test total: 4471 → 4476. Raw size: ~554.7KB.
