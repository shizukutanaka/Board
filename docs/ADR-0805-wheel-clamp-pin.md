# ADR-0805: Behavioural pins for wheel-pan/zoomAt clamps

- Status: Accepted (2026-09-28, v1.7.831) — test-only

## Decision

Extend the ADR-0798 pin set to the two wheel-driven producers, through
the real `canvas` wheel listener:

- plain/⇧ wheel pan: with `viewport.x` at `1e7-10`, 40 × `deltaX:120`
  wheel events land the center exactly on `+1e7`;
- ctrl+wheel zoomAt: 120 × `deltaY:-8000` events at a far screen point
  keep `|viewport.x|,|viewport.y| ≤ 1e7` (the derived center follows the
  cursor but never leaves the coord domain).

With the arrow-pan pin (ADR-0802) this covers every interactive
accumulator site; `centerOn`/`_fitViewport`/`_zoomToFrame` are
deterministic single-shot writes covered by the `_xC(` site-count pin
(≥14).
