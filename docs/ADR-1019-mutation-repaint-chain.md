# ADR-1019: live-mutation → repaint chain completeness audit

## Status

Audit complete — airtight (source pins added, v1.8.045).

## Context

A mutation that skips repaint invalidation leaves a stale canvas until
some unrelated frame. The audit traced every live-state mutation path
to `invalidate()` (full, `_iv`) or `invalidateDamage()` (`_iD`), and
both to `Minimap.schedule()`.

## Invariants verified

- **Op path covered:** `Store._apply` ends with a damage union —
  `if(!_dmg){_iv();}else{..._iD(_dmg);}` — so EVERY op kind (forward +
  backward) repaints; damage-clip covers the common path and the >60%
  viewport union falls back to full `_iv`.
- **Minimap co-scheduled:** `invalidate()`/`invalidateDamage()` both
  call `_ms()`; minimap scene cache keys on `_gridVer` (bumped by
  `_iG`), and `img.onload`/`_tTk` call `invalidateCache` for paths
  that mustn't bump the grid version.
- **In-place gesture mutations (ADR-0026):** move/resize/rotate
  gestures write geometry WITHOUT `_iG()` (per-move grid rebuild is
  wasted); draw()'s `need` re-check re-adds `dragStartShapes`,
  `resizeOrig`, `rotOrig` targets to `_drawIter` so a stale grid
  can't drop a dragged shape that entered the viewport.
- **Connector drags (`lblpos`/`ebend`/`cbend`/`way`)** need no
  `need` entry: arming requires a pointerdown within `HANDLE_SIZE`
  of a handle point inside the shape's registered bbox — the old
  cell is guaranteed in-view, so the shape stays in `_vis` and the
  per-shape `inView(s,_view)` check (current geometry) draws it as
  it enters. Gesture end commits a style op → `_apply` → `_iG`.
- **Pan blit (ADR-0028):** `panned&&!clipRects` skips the scene pass
  entirely only when the blit carries every pixel; exposed strips go
  through `clipRects`.

## Pins

- `_apply` tail: `if(!_dmg){_iv();}` + `_iD(_dmg)` present.
- `invalidate`/`invalidateDamage` both reach `_ms()`.
- draw() `need` covers the three gesture-orig sets.
- Connector dragKinds arm only via bbox-near handle hits.
