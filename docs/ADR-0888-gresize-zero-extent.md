# ADR-0888 — Group resize: zero-extent gBox collapses instead of NaN

## Status
Accepted, v1.7.914

## Context
`_gresizeDrag` maps every member's geometry through `_mapToBox(sh,orig,
ob,vb)` where `ob` is the start-of-drag union bbox and `vb` the resized
virtual box. The scale factors `vb.w/ob.w` / `vb.h/ob.h` divide by zero
when the union box has zero extent on an axis — reachable with two
selected vertical lines sharing an x (`ob.w===0`). The resulting
`Infinity`/`NaN` propagates into member `x/y/w/h`, `pts`, `way`, and
`bend` — corrupting the live shapes and any committed op before the
wire's `validShape` could matter (the damage is local first).

The cbend remap inside the same function already guards the identical
division with `||1`; the main scale factors simply never got it.

## Decision
`const sx=vb.w/(ob.w||1),sy=vb.h/(ob.h||1);` — when `ob.w` (or `.h`) is
zero, `(px-ob.x)` is also zero for every member (all live at the same
coordinate), so each member collapses onto `vb.x`/`vb.y` and takes the
new extent: a clean linear-map degenerate case rather than a divide by
zero. Matches the cbend-line precedent a few lines below.

## Consequences
Group resize on zero-extent unions degenerates to a uniform translate-
scale with finite coordinates; wire ops stay finite; no NaN can enter
the op log or LWW merges.
