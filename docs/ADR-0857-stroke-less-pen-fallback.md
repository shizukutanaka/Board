# ADR-0857 — stroke-less pen: --brand fallback + _tTk purges the pen bitmap cache

Status: accepted (v1.7.883)
Related: ADR-0018 (pen bitmap cache), ADR-0046 (union-fill pen), ADR-0288 (fill=none imports), ADR-0852 (_tTk theme-token invalidation)

## Context

`drawPen` coloured a stroke with the bare `c.fillStyle=_sk(s)` — i.e. `s.stroke`
raw. Every shape type that resolves a colour at draw time already falls back to
`--brand` when the prop is absent (`_sk(s)||_gC('--brand')` on box/frame,
minimap `--ink` for pens). Pens alone did not.

## Defects

1. **Arbitrary-colour stroke.** A pen whose `stroke` is unset is reachable —
   `validShape` bounds structure, not stroke presence, so a crafted `.board` /
   remote patch, or an SVG `<path>` imported without a stroke attribute, yields
   one. `fillStyle=null` is a no-op in canvas: the pen filled with whatever
   colour the previous draw left on the context (a neighbouring shape's colour),
   and the single-point path left that dirty state behind. Both call sites
   (live draw, `_penRender`'s offscreen rasterize, PNG/SVG export contexts)
   shared the leak.

2. **Token colour baked into the bitmap.** `_penRender` resolves the draw-time
   colour at rasterize time; the cache signature keys on `_sk(s)` (the raw
   prop). With an unset stroke, `null===null` stays a signature hit forever —
   after an OS scheme/contrast flip (`_tTk` → `clearCSSCache` +
   `Minimap.invalidateCache`, ADR-0852) the baked `--brand` bitmap survived and
   re-blitted the old theme's colour.

## Decision

- `drawPen`: `c.fillStyle=_sk(s)||_gC('--brand')` on both paths (single-point
  dot and the n≥2 union fill). Same convention as box/frame — a style default,
  not an a11y indicator, so `--brand` not `--accent-contrast`.
- `_tTk` now also runs `_penCache.clear();_penCachePx=0` — every raster that
  resolves a token colour is dropped on a theme flip. `_penBboxCache` is
  geometry-only and stays.

## Pins (test.mjs)

- Fill-time colour sampling on a recording ctx (the union path restores the
  old `fillStyle` on return, so the colour is captured inside `fill()`): a
  stroke-less pen no longer paints with the leftover sentinel, on both the
  dot and union paths.
- Source pin for the `_tTk` purge + the refreshed ADR-0852 matchMedia literal;
  `--accent-contrast` count updated for the two new deliberate `--brand` sites.

## Consequences

Stroke-less pens render deterministically in the brand colour everywhere
(canvas, minimap, exports), and no token-coloured bitmap outlives a theme flip.
Cost: ~80B.
