# ADR-0803: Clamp the presentation _zoomToFrame center too

- Status: Accepted (2026-09-28, v1.7.829)

## Background

A second sweep of every `_vp().x/y=` write found one site ADR-0798/0799
missed: `_zoomToFrame` (presentation slide nav). Its `frame.w` is a shape
prop ≤1e7 but `vW/(2*zoom)` unbounded at MIN_ZOOM, and an edge-hugging
frame lands the center outside the coord domain — same divergence class.

## Decision

`_xC` at both assignments. After this: **every** live `_vp().x/y=` write
in the file routes through the clamp (7 sites × 2 axes); the only
unclamped writes are the four `_vpOK`-gated adopt paths and the
`_xyOK`-gated excalidraw scroll adopt, which are correct by inspection.

## Consequences

The viewport-center invariant is now total and pinned (`_xC(` sites ≥14
plus a behavioural arrow-pan pin): no code path can place the live
center outside the wire-valid coord domain.
