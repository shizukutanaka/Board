# ADR-0809: Hand-drag pan clamp behavioural pin

- Status: Accepted (2026-09-28, v1.7.835)

## Decision

Pin the pointer-drag pan `_xC` clamp through the real gesture path:
`pickTool('hand')` + `pointerdown` + `pointermove` sweeps toward −x/−y
drive the center to +1e7 and stop — the last un-pinned interactive
accumulator is now covered. Every live viewport-write path (drag pan,
wheel pan, zoomAt, arrow keys, centerOn, _fitViewport, _zoomToFrame,
edge auto-pan) is clamped in production and pinned in tests.
