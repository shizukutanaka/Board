# ADR-1158: the presentation folds the remaining interactive chrome

Status: accepted (v1.8.182)

## Context

`Presentation.enter` builds a fullscreen overlay (canvas at `z-index:8999`) and
hides the toolbar, topbar, statusbar and minimap. Visual coverage, however, is
not reachability: three interactive surfaces stayed mounted and **tabbable**
while view-only:

- `#stylePanel` — every swatch / color input / range / dash button. A
  `change`/`input` there fires `applyStyleToSelection`, i.e. a **style/mutation
  op** (and a broadcast) in what is documented as view-only mode.
- `.zoom-badge` — `btnZoomOut`/`zoomVal`/`btnZoomIn`/`btnFit`: live viewport
  writes that fight `_goto`'s slide-fit (the badge itself is drawn on top of
  the slide since the canvas sits beneath the overlay's `pointerEvents:none`
  layer — DOM order keeps chrome above the canvas).
- `#shapeMirror` — every mirror button calls `_mirrorGo` → `_ss([id])` +
  `_fitViewport`: selection and viewport mutation mid-slide.

Socratic check on reachability: the pointer path is already closed — canvas
`pointerdown`/`dblclick`/wheel/pinch are `_pA()`-gated (ADR-0640), and the
overlay intercepts nothing (`pointerEvents:none` on the overlay, `auto` only on
the counter/exit). The **keyboard path** is the hole: the pres key router
swallows every key that isn't a navigation key (ADR-0640 pin, round360), so
Tab never moves focus — but a **focused element at `enter()` time keeps DOM
focus**, and Space/Enter on a focused swatch or mirror button still fires its
listener (native activation, not routed through the key gate). The pres would
silently mutate the deck mid-slide.

Also closed for the same reason: an open `#ctx` menu (physically unreachable
via keys under `_pA`, but cheap to guarantee the invariant).

## Decision

`enter()` now folds the remaining interactive chrome in one block, right after
the existing chrome hides:

```js
UI.closeCtxMenu();
_dsp(_g('stylePanel'),'none');
_dsp(_qs(document,'.zoom-badge'),'none');
_dsp(_g('shapeMirror'),'none');
```

`leave()` restores all three with `_dsp(el,'')` next to the other chrome
restores. No invoker-capture work: the pres already records `_focusTrigger`
itself and the folded surfaces are display-none (not removed), so focus
management is unchanged. The pres-active world now has exactly one reachable
control — the overlay's exit button.

## Alternatives

- `inert` on the surfaces: equivalent semantics, but `display:none` matches the
  file's existing fold idiom (`_dsp`) and keeps `leave()` symmetric — no new
  attribute surface.
- `Tab` swallow in the router: already true (ADR-0640), but it does not cover
  the focused-at-enter vector — hiding is the structural fix.
- Blur-and-block activation listeners per control: per-element gating is
  exactly the whack-a-mole the single-fold block avoids.

## Consequences

- Style edits, viewport writes and mirror-jumps are impossible during a
  presentation on every input path (pointer already gated; keyboard now
  structurally dead).
- `leave()` restores the surfaces unconditionally (`display:''` matches their
  pre-enter steady state; none of them is ever `display:none` outside pres).
- 10 pins (2 source + 8 behavioural: enter folds all surfaces + ctx; leave
  restores).
