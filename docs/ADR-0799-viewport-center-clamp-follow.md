# ADR-0799: Clamp the derived viewport centers too (fit/centerOn)

- Status: Accepted (2026-09-28, v1.7.825)

## Background

ADR-0798 clamped the four accumulative writes. The remaining live-write
producers are *derived* rather than accumulated: `centerOn` (peer-avatar /
mirror jump) and `_fitViewport` (⇧1 fit / ⇧2 zoom-to-selection). They were
left as "content-bounded": shapes are ≤1e7 so their centers are ~≤1e7 —
but the subtraction term `width/(2z)` is unbounded at tiny zoom, and a
shape hugging the ±1e7 edge yields a center past it anyway.

## Decision

Same `_xC` clamp at both sites. After this change every live-write of
`_vp().x/y` in the file routes through the bound — adopted values still
gate on `_vpOK` (ADR-0795), making the viewport-center invariant total:
**a live center is always inside the coord domain.**

## Consequences

- Fit on an edge-hugging or extreme-aspect selection can no longer land
  the view in the dead zone; the clamp is a no-op for all ordinary fits.
