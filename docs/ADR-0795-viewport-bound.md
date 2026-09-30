# ADR-0795: Bound the adopted viewport center (`_vpOK`)

- Status: Accepted (2026-09-28, v1.7.821)

## Background

Every viewport-adoption site (.board `loadBoard`, shared-link
`importFromHash`, IDB main restore, IDB backup restore) `_fin`-checked
`x/y/zoom` and clamped zoom — but left `x/y` unbounded. A crafted payload
`viewport:{x:1e15}` opens a board whose view sits 10¹⁵ units from every
shape: an apparently blank canvas. Recoverable via ⇧1 fit, yet still a
crafted-payload blank-board on the opening user — the same class as
ADR-0792/0793's bbox poisoning, on the view side rather than the shape side.

## Decision

New shared intake helper on the bound line:

```js
_vpOK=v=>v&&_xyOK(+v.x)&&_xyOK(+v.y)&&_fin(+v.zoom)&&+v.zoom>0;
```

Center coordinates must satisfy `_xyOK` (|v|≤1e7) — matching the shape
coordinate bound, since no legitimate shape can live outside it. All four
adoption sites fold their identical condition into `_vpOK(d.viewport)` /
`_vpOK(data.viewport)`, adding the bound while *reclaiming* ~75B. Zoom keeps
its existing `clampZoom` at assignment (zoom policy unchanged).

## Consequences

- Crafted or corrupt records/links can no longer teleport the local view
  out of the populated world; the payload falls back to the default fit.
- A user who legitimately pans past 1e7 and reloads loses the saved
  viewport only (opens at default view) — shapes never exceed 1e7, so a
  center beyond it is definitionally unhelpful.
- Behavioural pin: `restoreBackup` with `{x:1e15}` keeps the current view;
  `{x:1e4}` adopts normally.
