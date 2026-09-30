# ADR-0806: Clamp the edge auto-pan's saved-reference write

- Status: Accepted (2026-09-28, v1.7.832)

## Background

ADR-0804 declared the viewport-write audit complete after sweeping
`_vp().x=` sites — but `_edgePanTick` wrote through a **saved
reference**: `const v=_vp();v.x+=vx/v.zoom`. The holding pattern
escaped the literal-site grep. During a long edge-drag the rAF tick
accumulates `v.x += v.x/zoom` unbounded — same divergence class as the
pan sites (center outside the coord domain → every drawn shape
wire-invalid on peers).

## Decision

`v.x=_xC(v.x+vx/v.zoom)` / y-equiv. The corrected sweep rule for future
audits: search **all assignment targets whose receiver can alias
`state.viewport`** — `v.x=`/`v.y=` after `v=_vp()`, not only literal
`_vp().x=` sites. Remaining write forms (literal sites, saved refs,
`+=`) are now all covered; the `_xC(` site-count pin is raised to ≥16.

## Consequences

The centre invariant holds for the last interactive producer; the
hazard note generalizes to "any mutation of the viewport object".
