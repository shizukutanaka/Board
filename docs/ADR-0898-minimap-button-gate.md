# ADR-0898: Minimap scrub is primary-button-only

Status: Accepted (fix, v1.7.924)

## Context

ADR-0896 gated the canvas pointerdown on `e.button>1` so X1/X2 side
buttons and stylus barrels cannot arm gestures. The audit's remaining
button paths found the same hole on the minimap: its `pointerdown`
handler set `_mmNav=true` and captured the pointer unconditionally,
so a side-button press on the minimap armed the viewport scrub
(Figma/tldraw hold-and-move navigation) and followed every subsequent
`pointermove` until release.

## Decision

Gate the minimap `pointerdown` on the same `e.button>1` predicate —
primary (0) navigates, middle (1) pans per the canvas policy,
buttons ≥2 are inert:

```js
_on(mc,_PD,e=>{if(e.button>1)return;_mmNav=true;mc.setPointerCapture(e.pointerId);_mmGo(e)});
```

A behavioural pin in the event-series harness fires `pointerdown` +
`pointermove` at the minimap element with `button: 2` and `button: 3`
and asserts the viewport is unmoved.

## Consequences

- Every pointerdown arm-site (canvas + minimap) now rejects
  non-primary buttons — the `>1` policy is uniform.
- Middle-button users keep the navigate-and-hold behaviour; only
  side/stylus-barrel presses become inert.
