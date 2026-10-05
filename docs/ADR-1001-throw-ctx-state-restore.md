# ADR-1001: Per-shape draw isolation must restore ctx state on throw

## Status
Accepted, implemented.

## Context
ADR-0601 wrapped each `drawShape` call in `try{...}catch(_){}` so one bad
shape can't blank the whole board. But the bare catch only skips the
exception — it leaves whatever canvas state the shape had already mutated:

- `drawShape` sets `globalAlpha`, `letterSpacing`, `setLineDash`, line
  styles and shadows at entry (per-shape props).
- The rotation block does `_sv2` + translate + rotate; corner-clip and
  text-clip blocks save too. A throw between a `_sv2` and its `_rs2`
  leaves the save **unbalanced** — the CTM stays rotated/translated and
  any clip stays active.

The result: a shape that throws mid-draw corrupts every shape drawn after
it, on every frame — rotated, half-transparent, clipped or letter-spaced —
until the canvas is recreated. The isolation saved the shape that threw
and sacrificed the rest.

## Decision
`_rstCtx(c, z, v)` runs in the catch of every per-shape draw site:

- **Save-drain** (no `c.reset()` — it also clears the bitmap, which would
  blank every shape already drawn this frame): drain the save stack (`_rs2` on an empty stack is a
  no-op, so a bounded 64-iteration loop drains every leaked save including
  the frame's own dmg-clip save — repainting outside the clip is a harmless
  superset) and explicitly reset the props drawShape may leak
  (`globalAlpha`, `letterSpacing`, line dash, shadow).
- **`z`/`v` given** (the live `draw()` loop): re-apply the world
  transform `_sTF(c,z,0,0,z,-v.x*z,-v.y*z)` so the next shape draws at the
  right scale/offset.

Sites: the three scene loops in `draw()` (frames, non-frames, draft) and
`_dS` (ADR-0513/0907 export render loops — same leak class on offscreen
contexts; no transform re-application there since exporters set their own).

## Consequences
A throwing shape now costs only itself: subsequent shapes draw on a clean
ctx with the correct world transform. The save-stack can no longer drift
unbalanced across frames.

Pinned in `test.mjs` (source-level): reset fast-path, legacy prop reset,
world-transform re-application, and the `_dS` shared restore.
