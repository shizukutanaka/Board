# ADR-0798: Clamp the live viewport center at the coord bound

- Status: Accepted (2026-09-28, v1.7.824)

## Background

ADR-0795 bounded *adopted* viewport centers (`_vpOK`), and 0792 bounded
shape coords (`_xyOK`, |v|≤1e7). But the *live* viewport center itself was
never clamped: pointer-drag pan, wheel pan, arrow-key pan and `zoomAt` all
write `_vp().x/y` unboundedly. Past ±1e7 every subsequently drawn shape
carries wire-invalid coords — peers' `validShape` drops the `add` while the
local board keeps it (divergence), and nothing else could ever be seen
either (the center sits beyond all possible shapes).

## Decision

`_xC(v)=clamp(v,±1e7)` applied at the four live-viewport write sites:
pointer-drag pan (hand/middle), wheel pan, arrow-key pan, `zoomAt`. The
bound is `_xyOK`'s own domain — a center beyond ±1e7 can see nothing a
shape could legally occupy, so clamping loses no reachable view.

## Consequences

- Panning stops dead at the coord domain edge instead of drifting into the
  dead zone; drawing there still works (shapes land inside the bound).
- Page-level divergence class closed: local state can no longer express a
  viewport whose derived world coords are all wire-invalid.
