# ADR-1003 — Canvas backing-store × DPR lifecycle audit (clean)

## Status
Accepted — audit complete, no defect. Contract pinned in test.mjs (8 asserts).

## Question
`canvas.width`/`height` reassignment drops the whole bitmap. If any backing-store
or resolution change path fails to (a) reallocate both layers, (b) invalidate
dependent caches/snapshots, or (c) repaint, the board blurs, stretches, smears,
or shows a stale pixel copy. Audit every resize/DPR/context path for sync.

## Audit table

| Path | Verdict |
| --- | --- |
| `resize()` body | Clean — reallocates `canvas` **and** `ocanvas` in one call (`_wh(ocanvas,canvas.width,canvas.height)`); clears `_lastVp` (pan-blit copy, ADR-0028), `_pinchSnap`/`_pinchVp` (gesture preview, ADR-0030), `_teVp`/`_lblVp` (editor follow sigs, ADR-0561); `Presentation.refit()` if presenting (ADR-0606); ends in `_iv()` |
| window `resize` | Clean — `_resizeSoon` = 150 ms trailing-edge debounce (ADR-0631) |
| `visualViewport.resize` (iOS url-bar/keyboard) | Clean — routes through the same `_resizeSoon` (ADR-0251) |
| DPR change (monitor drag / OS scale) | Clean — `_watchDPR` arms a `(resolution: <dpr>dppx)` media query that single-fires then re-arms at the new ratio |
| GPU `contextlost`/`contextrestored` | Clean — `contextlost` `_pd`s (prevents default → allows restore); `_ctxUp` re-acquires both contexts, purges `_penCache`/`_inkD`/`Minimap` cache, `_iv()`+`_ivO()` (ADR-0627) |
| Presentation enter/leave | Clean — explicit `resize()` after the CSS box swap to/from `position:fixed` (a native resize never fires for this) |
| Boot | Clean — `resize()` runs in `main()` before the first frame |
| World↔screen math | Clean — `zoom*DPR` used consistently (`visibleWorldRect`, `_penRes`, `_inkD` raster origin snap) |
| `_inkD` draft-ink bitmap | Clean — intentionally *not* cleared on resize: it is world-geometry, not screen-geometry; resolution drift is handled by the `R>d.R*1.5‖R<d.R/1.5` rebuild gate; clearing mid-stroke would lose committed ink |
| Minimap `mc` | Clean — fixed 160×100 backing store; deliberately not DPR-scaled (tiny nav map) |
| Wheel-zoom preview | Clean — reuses `_pinchSnap`/`_pinchVp`, so `resize()` clears it too; the `_wheelZoomEnd` timer also clears 180 ms after the last tick |

## Conclusion
No stale backing store path exists: every allocator runs `resize()`, every
snapshot dependent on backing pixels is invalidated there, and every repaint
is re-armed via `_iv()`. Worst case is a debounced 150 ms of stretched pixels
during a window drag — intentional (ADR-0631).

## Pins
- `canvas.width=_rnd(r.width*DPR)` — scene buffer at device px
- `_wh(ocanvas,canvas.width,canvas.height)` — overlay layer in sync
- `_lastVp=null` — pan-blit invalidation on realloc
- `_pinchSnap=null;_pinchVp=null` — gesture preview snapshot cleared
- `_on(window,'resize',_resizeSoon)` — debounced window resize
- `if(window.visualViewport)_on(visualViewport,'resize',_resizeSoon)` — iOS path
- `(resolution: ${_dpr()}dppx)` — DPR watcher
- `_on(ocanvas,'contextrestored',_ctxUp)` — overlay context restore
