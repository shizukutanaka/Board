# ADR-0808: Edge-pan clamp behavioural pin

- Status: Accepted (2026-09-28, v1.7.834)

## Decision

Pin ADR-0806's edge auto-pan `_xC` clamp behaviourally: `_edgePanTick`
is exported to the test harness and driven directly (rAF is a no-op
stub in the harness, so the tick is invoked rather than dispatched).
With a held pointer beyond the right/bottom edge margin and the center
near +1e7, the tick parks both axes at +1e7 — the last interactive
accumulator's clamp is now regression-pinned.

Every live viewport write path (pointer-drag pan, wheel pan, zoomAt,
arrow keys, centerOn, _fitViewport, _zoomToFrame, edge auto-pan) is now
both clamped in production and pinned in tests.
