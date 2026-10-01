# ADR-0947: Numeric-prop domain audit — every prop is intake-bounded or consumption-clamped

## Status

Accepted (2026-10-01)

## Context

ADR-0946 added a sign gate for `w`/`h` extents. That raised the natural
question: of the 18 props on `validPatch`'s numeric whitelist
(`z,rotate,size,opacity,dash,labelPos,cbend,spacing,lineH,fontSize,
elbow,curve,hop,flip,r,visible,start,wrap`), which ones still accept an
out-of-domain value through wire/import/IDB, and does any of them turn
into a real defect downstream?

Each prop was traced to every consumer:

| prop | domain | verdict |
|---|---|---|
| `z`, `rotate`, `cbend` | all reals | legitimate — geometry has no sign constraint |
| `size`, `fontSize` | (0, 1e4] | intake-bounded (ADR-0868) |
| `opacity`, `aF`, `bF` | [0,1] | intake-bounded (0367) |
| `r` (corner radius) | ≥0, capped | consumption-clamped: `roundRect` does `r=_max(0,_min(r,w/2,h/2))`; elbow/diamond paths are `s.r>0`-gated, negative falls back to the sharp path |
| `dash` | {0,1,2} | consumption-clamped: `dashArr` returns `[]` (solid) for any other value — pinned since v1.6.16 |
| `labelPos` | [0,1] | consumption-clamped: every consumer funnels through `_pathAt`, which does `t=_c01(t)` |
| `flip` | bitmask {0..3} | consumed as `s.flip&1`,`&2` — out-of-range bits are ignored |
| `elbow`, `curve`, `hop`, `visible`, `start`, `wrap` | flag | truthy/falsy — any number collapses to a boolean meaning |
| `spacing`, `lineH` | real, cosmetic | unbounded but cosmetic-only: `lineH` feeds `lh=fs*(s.lineH\|\|1.25)` — negative/huge values shrink the rendered text to ≤1 line; `spacing` feeds `letterSpacing` — arbitrary px. Neither crashes, poisons geometry, nor diverges |

## Decision

No code change. The domain-safety rule for numeric props is now
explicit: **every prop must be either (a) bounded at intake
(`validPatch`) or (b) clamped/gated at every consumption site.** The
audit found each prop already satisfies one of the two.

`spacing`/`lineH` are deliberately left unbounded — their worst case is
a locally-recoverable cosmetic oddity (invisible/degenerate text), in
the same accepted class as `w:0`. Bounding them at intake would add
bytes for no safety gain.

## Consequences

- 3 behavioural asserts pin the `labelPos` clamp through `_pathAt` and
  `_connLabelXY` — the clamp is the contract.
- The consumption-clamp column is the audit's checklist for any future
  numeric prop: if a new prop's consumer doesn't clamp, `validPatch`
  must.
- pass count: 3025 → 3028. raw 557,054B unchanged.
