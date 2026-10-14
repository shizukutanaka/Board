# ADR-1205 — Deferred `open()` attach loads the stored doc

## Status
Accepted (round955) — fix.

## Context
`Persist.open()` resolves in-memory on `onblocked` (ADR-0884) so a second tab
blocked by an older-version connection never hangs at boot. The blocked IDB
request stays pending and completes when the blocker releases — its deferred
`onsuccess` then bound `this.db` and stopped there.

That created a data-loss window: the tab booted with an empty board, ran
`load()` while `this.db` was still null (no-op), then on the deferred connect
the next autosave **overwrote the stored document it had never loaded** —
the user's real board, silently replaced by whatever the second tab held.

## Decision
`open()` now marks the request `blocked` and, when the deferred `onsuccess`
arrives, runs `this.load()` — but only while the local board is still empty
(`!_nS()`). A board the user already drew on keeps its strokes; the stored doc
is then (by the pre-existing in-memory design) overwritten on the next save,
which is the documented tradeoff rather than a silent surprise: `load()` on a
non-empty board would itself clobber the newer in-memory work.

Failure of that deferred load is swallowed — the db handle is still bound and
the normal save path takes over on the next `schedule()`.

## Invariants
- `onblocked` → resolve in-memory AND mark the request; `onsuccess` on a
  blocked request re-attaches `this.db` (plus the `onversionchange` yield).
- Deferred attach on an empty board → `this.load()` once (fire-and-forget).
- Deferred attach on a non-empty board → no load; local strokes win.
- The normal (unblocked) path is unchanged: `onsuccess` binds db and the
  caller's explicit `await Persist.load()` at boot does the load — no double
  load.

## Pins (test.mjs)
- Behavioural: blocked→resolve→deferred onsuccess with empty board calls
  `Persist.load` once; with a non-empty board it does not call it.
- Source: `blocked=1` in `onblocked`; `if(blocked&&!_nS())this.load()` in
  `onsuccess`; `onversionchange` yield string preserved verbatim.
