# ADR-0887 — Minimap scene render: per-shape isolation + commit-on-success version

## Status
Accepted, v1.7.913

## Context
`Minimap._renderScene` painted every visible shape into an offscreen
bitmap keyed on `_gridVer`, and set `_sceneVer=_gridVer` **before** the
loop. If a single shape's draw path threw (e.g. a degenerate connector
reaching `_elbowPts`/`_curveCtrl`), the exception unwound mid-loop —
leaving the scene bitmap half-painted but versioned as current. Every
subsequent `draw()` then blitted the truncated scene until the next
`_gridVer` bump or explicit `invalidateCache()`. Silent, persistent,
and invisible to the main canvas (which has had per-shape isolation
since ADR-0601).

## Decision
Apply the 0601 rule to the minimap renderer, in the smallest possible
edit:

1. Wrap the per-shape `switch(s.type)` in `try/catch` — the throwing
   shape is skipped, the rest of the scene completes.
2. Move `_sceneVer=_gridVer` to *after* the loop — a throw outside the
   per-shape guard (e.g. `_bA` failing) leaves the version stale so the
   next scheduled draw retries instead of caching the wreck.

The `_mr` save/restore stays outside the try: `sx.save()`/`rotate()`
cannot realistically throw, and `if(_mr)_rs2(sx)` still runs after the
guard so a rotation transform never leaks into the next shape.

## Consequences
Minimap degrades gracefully: one bad shape loses its minimap glyph
instead of truncating the whole scene; transient failures self-heal on
the next frame. Cost: ~60 raw bytes.
