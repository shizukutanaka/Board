# ADR-0891: Division-by-extent & numeric-domain audit — complete

Status: Accepted (recorded, v1.7.917)

## Context

ADR-0888 fixed a real zero-extent division (`_mapToBox` on a zero-width
group-resize box → NaN member coords). That pattern has a family: any
expression of the form `x / extent` where `extent` can be 0, and any
domain-error primitive (`_log(0)`, `_sqr(<0)`, `_hp` of nothing) that
can yield NaN/Infinity into geometry or viewport state. This audit
walked every division and domain site in index.html.

## Sites verified guarded

**Geometry divisions** — every denominator is floored, early-returned,
or short-circuit-guarded:

- `_pathAt`/`_pathNearestT`/`_connLabelXY` path-length totals:
  `if(!tot)return` before the walk; per-segment `d>0` required.
- `_edgePt` contour projection (diamond/ellipse): `_rx||1e-6`,
  `_ry||1e-6`, `||1e-6` inner guards; box branch uses `1e9` fallback.
- `applyResize`: `orig.w>0&&orig.h>0` gate on the ratio-lock; `clamp=4`
  min size; pen path requires `ob.w&&ob.h`.
- `_mapToBox` (0888): `ob.w||1`, `ob.h||1` — members collapse onto vb.
- `_grotDrag` anchor re-normalization: `nb.w||1`, `nb.h||1` + `_c01`.
- Free-end 45° constrain: `if(dd)`; line-density mean: `cn?dd/cn:0`;
  ellipse-fit variance: `mean>0` guard around `_sqr(variance)/mean`.
- `exportScale`: `w>0&&h>0` early return; `EXPORT_MAX_DIM/w`,
  `EXPORT_MAX_AREA/(w*h)` only fire on positive extents.

**Domain-error primitives**

- `_log(ratio)` in `zoomAt` paths: pinch ratio 0 → `_log(0)`=-Inf →
  `clampZoom(zoom*0)`=MIN_ZOOM (bounded, finite); NaN ratio fails the
  `|ratio-1|>0.005` gate before `_log` runs. Gesture `e.scale/_gScale`
  follows the same clamp landing.
- `zoomBy(f)`: called only with fixed positive f (1.2, 1/1.2).
- `_fitViewport`: `clampZoom` on the min of the two fit ratios; `b`
  always a bbox with `w,h>0` from `_bA`'s filter or a frame.
- `_sqr`: variance term (always ≥0), `ab.w*ab.h` products (positive).

**Viewport writes** — `w/(v.zoom*DPR)` etc.: zoom is `clampZoom`-bounded
(>0), DPR ≥1; every `v.x/v.y` write passes `_xC` (0798–0806).

## Rule recorded

Any division by a bbox extent, path length, count, or hypot needs an
`||1`, an `||epsilon`, an early return, or a `>0` guard — and any
`_log`/`_sqr`/`exp` input feeding geometry must land inside a clamp.
Both rules now hold at every site; the pin added in 0890 covers the
`_mapToBox` representative.

## Consequences

- No code change this round (audit only); V + docs bookkeeping only.
