# ADR-0935 — local coordinate producers bound at the wire bound

## Status

Accepted — implemented 2026-10-01 (v1.7.961).

## Context

ADR-0792 bounds every geometry coordinate arriving over the wire at
`_xyOK` (±1e7): a patch carrying a bigger magnitude fails `validPatch`
and the *whole op* is dropped at intake. Local writers, however, were
unbounded:

- `Shape.translate` applies deltas directly (`s.x+=dx`, `s.pts[i]+=`,
  `s.way[]`, `s.bend`) — keyboard nudges, drags, align/tidy offsets and
  edge auto-pan moves can accumulate past the bound.
- `G.s2w` converts pointer positions to world coords; with the viewport
  clamped at ±1e7 (ADR-0798/0799) a pointer at the screen edge under a
  small zoom can land just beyond.

A shape pushed past ±1e7 keeps working locally, but every subsequent
patch (`move`/`upd`/`style`) carrying that coord is rejected remotely —
the two sides silently diverge.

## Decision

Clamp at the producer, not the receiver:

- `Shape.translate` wraps every written coordinate in `_xC` — deltas can
  never push a destination past the bound, and first touch *heals* a
  shape already out of range.
- `G.s2w` clamps the returned world point — pointer-derived targets
  (resize/rotate/pen `contPen`/bend/waypoint drags, drop positions) stay
  inside the representable range.

Clamping the producer keeps local state and wire values identical;
clamping at intake instead would leave local state divergent by the
unclamped remainder.

## Consequences

- Reachable divergence on 'move'/'upd'/'style' ops at the board edge is
  closed.
- Gestures stop at the ±1e7 boundary rather than carrying content past
  the representable range — matching the viewport clamp (0798/0799) and
  the local-input bound family (0866).
- Residual: `applyResize` can in theory emit `w/h` up to ~2e7 when a
  shape spans the full bound (anchor −1e7, pointer +1e7) — unreachable
  in practice since content is producer-bounded; documented, not gated.

## Tests

- `Shape.translate` clamps destination `x`, connector `x2/y2` at 1e7.
- `G.s2w` clamps pointer-derived world coords at 1e7.
