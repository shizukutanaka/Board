# ADR-0804: Viewport-write audit complete — all paths bounded

- Status: Accepted (2026-09-28, v1.7.830) — docs only

## Audit

Exhaustive sweep of every `state.viewport` mutation after ADR-0803:

- **Live x/y writes** (7 sites × 2 axes): all route through `_xC`
  (pointer-drag/wheel/arrow pans, `zoomAt`, `centerOn`, `_fitViewport`,
  `_zoomToFrame`).
- **Live zoom writes**: literal `1`, `_fitViewport`'s clamped `z`, and
  `_zoomToFrame`'s `clampZoom(min(scaleX,scaleY,4))` — all bounded.
- **Adopt paths** (external data → viewport): `.board` load ×2, share
  link, snapshot doc — all `_vpOK`-gated; drawio appState/dx +
  excalidraw scrollX/Y — `_xyOK`-gated with `clampZoom` on the zoom;
  all reject or normalize out-of-domain values.

No unvalidated or unclamped path remains; the centre invariant
"live viewport centre ∈ coord domain" is total.

## Changes

- architecture.md viewport-center bullet names `_zoomToFrame` (ADR-0803)
  so the doc lists the complete write set.
