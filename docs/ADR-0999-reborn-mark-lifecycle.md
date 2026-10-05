# ADR-0999: reborn-mark lifecycle audit — complete + dead-code sweep

## Status
Accepted — audit clean; one dead helper removed (~150B reclaim); pins added.

## Context

`ptr.reborn` / `_nug.reborn` (ADR-0970/0984) mark ids that were (re)born
from a REMOTE peer while a gesture / pending-nug was live, so the
orig-restore path skips them — a remote write must not be overwritten
by a local gesture's arm values (one-way divergence class).

The lifecycle hazard: if a mark survives its gesture, a LATER gesture's
cancel would wrongly skip restoring that id — the same divergence,
one gesture later.

## Audit result — lifecycle closed

- `ptr.reborn` is created only under `ptr.down` (`_bT`, 855) and cleared
  by `ptr.reborn=null` inside `_ptrReset` (3980) — the terminal state
  every gesture-exit path converges on since ADR-0764. Marquee/select
  gestures never consult it but it is cleared regardless.
- `_nug.reborn` is created only while `_nug` is pending and is consumed
  at `_nugEnd` (`_nugLock(o,n.reborn)`) — `_nug=null` drops the whole
  object, so the set cannot outlive its flush.
- Both marks are gated on `c.peer!==_pi()` — own incarnations and local
  births (alt-drag copies, own adds) never poison the restore domain.
- Ordering inside `_nugEnd`: `_nug=null` before `_nugLock` — a birth
  arriving during the flush does not retro-mark the pending op (the
  gesture already decided); correct.

## Dead-code sweep

`snapBox(mov,targets,tol)` — the original `targets`-taking wrapper —
became dead when every caller moved to `_snapBoxIdx` over the cached
`_mkSnapIdx` index (ADR-0488 era). Removed (~150B): the wrapper, its
doc comment. `_snapBoxIdx`, `_mkSnapIdx`, `_snapBest`, `_gV`, `_gH`
remain the live path.

## Pin coverage (test.mjs)

- `ptr.reborn=null` present in `_ptrReset` (gesture-exit clears).
- `ptr.reborn||(ptr.reborn=new Set())` (marks only under ptr.down).
- `_nugLock(o,n.reborn)` (pending-nug set consumed at flush).
- `_nug.reborn||(_nug.reborn=new Set())` (nug marks only pending).
- `function snapBox(` absent (dead wrapper stays removed).
