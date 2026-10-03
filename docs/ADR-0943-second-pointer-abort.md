# ADR-0943: Second-pointer abort pinned through real dispatch

## Status

Accepted (2026-10-01)

## Context

Round692 audited the gesture-state and derived-state lifecycle:
- eraser (`eraseAt`/`flushErase`) at `doDelete` parity — frame cascade, locked skip, connClears, `_eraseBatch` restore on cancel;
- overlay/ptr teardown (`_zR`, `_ptrReset`, `abortGesture`) — draft, marquee, guides, lasso, `_penPred`, `lineClick` all have a cleanup path;
- dup accumulation (`dupIds`/`dupDelta`) — seeded at `_placeCopies`, accumulated at nudge + endSelect;
- history bound (`MAX_HISTORY=500` shift) + `origSel` page-safety (`_ss` filters `byId && _sv && _pgOk`);
- clipboard paths (`doCopy`/`_osCopy`/`doPaste`/`_placeCopies`) — copy/cut consume `_cpNow`, paste centers + cascade reset;
- `_fitViewport` degenerate-bbox safety (0-extent → cap wins, no NaN);
- `endPen` single-point commit (dot) + RDP zoom-adaptive eps;
- pinch/multi-touch bookkeeping — `_pointers` capture-phase tracking, `_resetPinch` on <2, `_clearTouchState` shared across blur/hidden/pagehide, Safari gesture events handled.

All verified clean. The only coverage gap: the multi-touch
abort path — a second `pointerdown` mid-gesture sees `_nP()>=2` in the
bubble PD listener and calls `abortGesture()`, which drops the uncommitted
draft and `_geoR`-restores any in-place mutation. That path was pinned only
by a direct-call test (`abortGesture: pinch cancels & reverts`), never by
real event dispatch — the actual trigger (pointer capture bookkeeping
feeding `_nP()`) was unverified.

## Decision — pin the abort contract through real dispatch

Behavioural pins via the `fire()` harness (capture + bubble listeners,
distinct `pointerId`s):

1. rect gesture: PD + PM → PD2 aborts — `ptr.down` cleared, `state.draft`
   dropped, both PU's commit nothing (`state.shapes.length===0`).
2. select move-drag: PD interior + PM mutates in place (x 100→140) → PD2
   reverts via `_geoR` back to x===100 and no `move` op is committed
   (`history.length===1`, the seed `add` only).
3. post-abort: the primary finger's PM/PU never resumes the dead gesture —
   the shape stays at its reverted position.

## Consequences

The abort contract is now fixed at the dispatch level: `_nP()>=2` →
`abortGesture()` → draft drop + geo revert + no resume. A regression that
skipped the revert, double-armed a gesture, or let the primary finger
resume would trip these asserts. `pass += 7` (tally 3013).

No source change: test-only pin.
