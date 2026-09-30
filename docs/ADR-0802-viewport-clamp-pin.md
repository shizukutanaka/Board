# ADR-0802: Behavioural pin for the viewport center clamp

- Status: Accepted (2026-09-28, v1.7.828) — test-only

## Decision

Pin ADR-0798 through the real keydown listener: with `viewport.x` set
just inside ±1e7, 40 arrow-key pans must land the center exactly on the
bound in both directions (source-level `html.includes` pins existed but
the `+=`→`_xC` rewrite of an accumulator was the actual hazard — an
ungrouped operand would silently break panning).

Also recorded: the adopted-zoom audit is complete — all four adopt paths
(`.board` load ×2, share-link, snapshot doc) pass the zoom through
`clampZoom` after the `_vpOK` gate, so live `MIN_ZOOM..MAX_ZOOM` parity
holds on every intake.
