# ADR-0793: Bound every prop that feeds geometry — size, bend, binding focus

- Status: Accepted (implemented 2026-09-28, v1.7.819)
- Follows: ADR-0792 (coordinate magnitude bound)

## Background

ADR-0792 bounded `x,y,w,h,x1,y1,x2,y2`/`pts`/`way` at intake after the
1-op blank-board finding. The audit that followed asked which *other* accepted
props can reach a geometry consumer. Three remained:

- **`s.size`** — `G.bbox` pads pen strokes by `size/2`, connectors by
  `size/2` (+ `size*3` for arrowheads), and `_elbowPts` derives its stub as
  `_max(16,size*8)`. `size:1e9` inflates a shape's bbox to ~8×1e9 — the same
  `bboxAll` poison as a far coordinate, without a single coordinate key.
- **`s.bend`** — the elbow trunk coordinate (ADR-0072/0148: a literal world
  coordinate). `_elbowPts` splices `{x:s.bend}` into the route verbatim, so
  `bend:1e15` extends the connector bbox to 1e15.
- **`s.aF`/`s.bF`** — bound-endpoint focus fractions, stored `{fx,fy}` in
  [0,1] (writers clamp via `_c01`). Intake checked only `_fin`, so
  `aF.fx:1e9` places the resolved endpoint at `center + 1e9*extent` — again a
  far-off route and a poisoned bbox.

All three flowed through `validPatch` on every intake path (ops, snapshots,
`.board` import, IDB restore), so each was a one-message blank-board DoS for
every peer — and persisted into every consumer (fit view, minimap, exports).

## Decision

`validPatch` gains three magnitude rules:

1. `bend` joins the `_xyOK` coordinate list — it is a world coordinate and
   shares the |v| ≤ 1e7 bound.
2. `size` is capped at 1e4 (stroke widths are ≤ ~200 in practice; the pad only
   needs to bound, not reject negatives — `-size` remains ignored as before).
3. `aF.fx/fy` and `bF.fx/fy` are bounded to [0,1] — the range all writers
   produce via `_c01`. NaN and non-numbers are rejected by the range test
   itself (every comparison fails), so `_fin`/`_iN` checks became redundant
   and were dropped.

`cbend` needed no bound (`_curveCtrl` clamps ±400), `rotate` only scales the
AABB by ≤ √2 of bounded extents, and `spacing`/`lineH`/`fontSize`/`dash`/
`labelPos`/`r`/`opacity` affect rendering only — canvas clamps or ignores
absurd values, and the loops over them are bounded. `z` stays unbounded
(frac-derived ordering keys legitimately reach large magnitudes).

## Tradeoffs

- A legitimately huge stroke (`size>1e4` world units ≈ thicker than a small
  board is wide) is now rejected — unreachable from the UI and meaningless
  visually.
- `aF/bF` slightly out of [0,1] from buggy or hand-crafted sources is rejected;
  wire writers always clamp, so convergence is unaffected.
- Old peers still emit nothing new; the change is intake-side only.
