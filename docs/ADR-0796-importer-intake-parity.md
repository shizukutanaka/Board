# ADR-0796: Local importers share the wire's intake bounds

- Status: Accepted (2026-09-28, v1.7.822)

## Background

ADR-0792/0793 bounded wire intake (`validShape`/`validPatch` reject far
coords, huge `size`, out-of-range focus). But the three file parsers —
`drawioToShapes`/`svgToShapes`/`excToShapes` — commit their output through
`_cOp({op:'addMany'})` **without** `validShape`. A file with `x="1e15"`
would land a shape locally while every peer's `validOp` rejected the
broadcast — a genuine divergence, not just a local blank view. The same
unbounded-class hole also let drawio `_dioVp` (`dx`/`dy`) and excalidraw
`appState` (`scrollX`/`scrollY`) adopt far viewport centers — the ADR-0795
bug via a different door.

## Decision

- Parser output is filtered through `validShape` at each commit site:
  `if(!shapes||!_ln(shapes=shapes.filter(validShape))){reject}` — folded
  into the existing empty check (drawio, svg, exc), plus
  `p.sh=p.sh.filter(validShape)` on the multi-page drawio `pageAdd` path.
  Dropping is the right parity: peers see nothing invalid, so local drops
  it too — no clamping surprises, no divergence.
- `_dioVp` construction requires `_xyOK(ddx)&&_xyOK(ddy)`; the excalidraw
  `appState` adoption swaps `_fin` for `_xyOK` on `scrollX`/`scrollY`
  (`_xyOK` subsumes the finiteness check).

## Consequences

- Import intake now enforces identical bounds to the wire — a poisoned
  element is absent everywhere, not "local-only". An all-invalid file
  rejects like an empty one.
- Behavioural pin (exc real path): far element dropped, valid sibling
  imported, far `scrollX` ignored, all-invalid file rejected.
  drawio/svg share the same `validShape` filter (source-pinned; DOMParser
  is unavailable in the node harness).
