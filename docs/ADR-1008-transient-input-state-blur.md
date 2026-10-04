# ADR-1008: transient input-derived state must not survive window blur

## Status

Implemented (v1.8.034).

## Context

Window `blur`/`visibilitychange→hidden`/`pagehide` is a hard boundary: the
OS may swallow every event that would normally clean up a held-modifier or
hover-derived state (Alt keyup, pointerleave, keyup). ADR-0534/0604/0608/
0611/0632 already cover the *pointer* family — gesture cancels, `_pointers`
/ pinch state / minimap nav clear, the peer cursor hides, `_prevTool`
restores. This audit enumerated every other input-derived transient state
against the same boundary:

| State | Boundary coverage |
|---|---|
| `ptr.down` / gesture | `_cancelPointerGesture` (0604) ✓ |
| `_pointers`, `_pinchPrev`, `_pinchSnap` | `_clearTouchState` (0608/0950) ✓ |
| `Minimap._mmNav` | `cancelNav()` (0534/0632) ✓ |
| `_longPressTimer` | `_clearLongPress` via cancel funnel ✓ |
| `draft`/`marquee`/`guides`/`readout`/`bindPreview`/`lasso` | `_zR()` via gesture cancel (0509) ✓ |
| `window._prevTool` (space temp-hand) | blur restore (0534) ✓ |
| `Net.sendCursorHide` | blur + hidden (0611) ✓ |
| `state._sbf` slider preview | blur commits (0962) ✓ |
| edit overlays | own blur→commit (0967 family) ✓ |
| `state.measure` (⌥measure) | **only Alt keyup / pointerdown — hole** |
| `state.hover` (quick-conn dot feed) | **only pointerleave (0526) — hole** |
| `state._ehov` (eraser hover box) | **only pickTool — hole** |
| `ptr.lineClick` | deliberate — a multi-click modal step, survives by design (like Excalidraw's pending point) |

The three holes were the same defect class ADR-0526 fixed for
`pointerleave`: `blur` fires no `pointerleave`, so the overlay chrome
frozen at blur time (Alt-measure gap guides, quick-connect dots target,
the eraser's red preview box) outlived the input that produced it and
repainted every frame until the user happened to return and move the
pointer — and for `state.measure`, until the *next Alt keydown*, since
only the keyup cleared it.

## Decision

Funnel all three into `_clearTouchState` — the shared blur/hidden/pagehide
re-base already called from every lifecycle path (`window blur`,
`visibilitychange→hidden`, `pagehide`, `_cancelPointerGesture`):

```js
function _clearTouchState(){_pointers.clear();_pinchPrev=0;
  if(_pinchSnap){_pinchSnap=null;_pinchVp=null;_iv()}
  Minimap.cancelNav();
  state.measure=state.hover=state._ehov=null}   // ADR-1008
```

plus one `_ivO()` in the blur handler so the overlay repaints without the
ghost chrome (`_cancelPointerGesture` already `_iv()`s on the gesture
path; a blur with no live gesture needs the explicit overlay invalidate).

Post-cancel hover knowledge is legitimately gone — the next pointermove
re-derives `hover`/`_ehov`/`measure` from the live pick anyway.

## Consequences

- No more ghost measure guides / quick-conn dots / eraser preview after
  alt-tab, tab switch, or window deactivation.
- Contract: new transient (modifier-held or hover-derived) visual state
  must clear via `_clearTouchState` or re-derive per frame — never depend
  on the matching keyup/pointerleave arriving.
- Behavioural pin seeds `state.measure`/`hover`/`_ehov` and fires a real
  `blur` through the recorded window listener.
