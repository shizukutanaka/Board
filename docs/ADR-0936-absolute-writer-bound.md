# ADR-0936 — Bound the absolute coordinate writers at the wire bound

Status: implemented (v1.7.962)
Date: 2026-10-01

## Context

ADR-0935 clamped the delta/screen producers (`Shape.translate`, `G.s2w`) at
the ±1e7 wire bound because `validPatch` (0792) drops any patch whose
`x,y,w,h,x1..y2,bend` or `pts/way` coordinate exceeds it — a local writer
emitting one makes the op apply locally and die remotely (divergence).

That ADR documented one residual: the **absolute** writers — `applyResize`,
`_mapToBox`, `_rotPtsAbout` — could still emit |coord|>1e7 in extreme corner
cases (resizing a shape whose opposite edge sits at the bound produces
`w` up to ~2e7; rotating a boundary shape or group-mapping a member into a
clamped vbox can push a coordinate past it).

## Decision

Clamp the mapped/rotated coordinate at the write site, same producer-side
rule as 0935:

- `_mapToBox` — `M` clamps its output (covers pts, x1..y2, way, box, bend
  trunk anchors in one site).
- `applyResize` — pen pts map and `p1/p2` endpoint writes clamp `sp`; the
  box-path tail runs `x,y,w,h` through `_xC` before the readout (covers
  the se-grow, Alt-mirror, aspect-lock and rotated re-pin paths, and the
  virtual box `_gresizeDrag` maps members through).
- `_rotPtsAbout` — `rot()` clamps its output (covers pts, endpoints, way,
  and the `_rotBend` trunk since it consumes `rot`).

`cbend` stays unclamped: it is a signed perpendicular *offset*, not a world
coordinate — `validPatch` doesn't bound it and the draw path treats it as a
ratio-scaled distance.

## Consequence

Every local coordinate writer now keeps state within the wire domain, so a
locally-applied op can never produce a patch a peer will reject. Tests pin
applyResize w / endpoint / pen-pts, _mapToBox and _rotPtsAbout clamps
(2993 assertions).
