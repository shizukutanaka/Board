# ADR-1002: rAF / render-loop exception safety audit — clean

## Context

ADR-0565 wrapped the two draw calls in `frame()` in try/catch, and ADR-1001 closed
the ctx-state leak those catches exposed. This round audits the wider invariant:
**no throw anywhere in the render loop, its re-arm paths, or the surrounding
async/persist/storage callbacks may wedge the board.** A wedged `_rafId` (set but
no frame scheduled) freezes the canvas permanently; a swallowed error that should
have surfaced is a silent data-loss class.

## Audit — every slot clears its id before work, so a throw stays re-armable

| Slot | Guard |
| --- | --- |
| `frame()` (2418) | `_rafId=0` first line; `try{draw();drawOverlay()}catch` (0565); `needsRender=false;needOverlay=false` runs *between* the two try blocks so a hook-side `_iv()` in the second block still reaches the re-arm at 2437; hooks (`sendSelectionIfChanged`/`_mirrorSync`/`_teFollow`/`_lblFollow`/`_syncStylePanelIfChanged`/`_statusSel`) under a second try |
| `invalidate*()` (2406/2413/2417) | all re-arm via `if(!_rafId)` — a dead loop self-heals on the next invalidate instead of double-scheduling |
| boot arm (10288) | `_rafId=_rAF(frame)` once; flags false → loop exits cleanly, `_rafId=0` |
| minimap `draw()` (10224) | `_raf=0` at head → `schedule()` re-arms after a throw; `_renderScene` sets `_sceneVer` only on success (a throw re-runs the full scene next draw — cache never poisons, ADR-0887); the rot `_rs2` sits **outside** the per-shape try so a mid-shape throw still balances the save; per-shape props are re-set at iteration head so nothing leaks across shapes |
| `_edgePanTick` (4331) | `_edgeRaf=0` at head → `_edgePanKick` re-arms on the next near-edge pointer event |
| `_ctxUp` (9408, contextrestored) | purges GPU caches (`_penCache`/`_inkD`/minimap) and calls `_iv()`+`_ivO()` — full repaint after a GPU context loss |

## Audit — error surfacing vs. deliberate swallow

| Path | Verdict |
| --- | --- |
| `Persist.save` (8665) | `catch(err)→_saveErrMsg` — `QuotaExceededError` gets its own toast key; generic failures toast `saveFailed`; `_quotaWarn` fires a proactive 80%-of-origin warning |
| `Persist.saveBackup` (8741) | best-effort `catch(_){}` — acceptable: the destructive op still proceeds and the very next `save()` surfaces the same quota error via toast; a "backup failed" toast would be noise (ADR-0004) |
| `requestDurable`/`_quotaWarn`/`estimate` | swallowed by design (progressive enhancement) |
| `localStorage` `_ls` writes (929/8871/8885/8903) | all inside `try` — 929's `PEER_ID` IIFE falls back to `uid()` on throw |
| `_wrapCache`/`_clCache` | `WeakMap` keyed on the shape object — dead shapes GC themselves, no purge surface needed |

## Decision

No defect. The two-try / flag-order structure in `frame()` (ADR-0565) plus the
uniform "clear the rAF slot before work" idiom across all four loops means a
throw degrades to ≤1 frame of stale pixels and self-heals on the next invalidate.
Pinned: the clear-before-work ordering, the dedup re-arm, the draw try/catch,
the minimap `_rs2` placement outside the per-shape try (the subtle property that
keeps throws balanced), and the boot arm — 8 asserts.

## Consequences

Regression guard: a future refactor that moves `_rafId=0` after the draw calls,
or moves the minimap `_rs2` inside the per-shape try, or drops the flag-clear
between `frame()`'s two try blocks, fails the pins.
