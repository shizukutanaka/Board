# ADR-0817: Timer & interval lifecycle audit complete

- Status: Accepted (2026-09-28, v1.7.843)

## Scope & Result

Audited every `setTimeout`/`setInterval` site for the leak classes:
fires-into-cancelled-gesture, survives-room-switch, duplicates on
re-arm, and holds a resource after use.

- `_longPressTimer` (LONG_PRESS_MS): armed on touch pointerdown;
  `_clearLongPress` runs on `pointerup` and inside
  `_cancelPointerGesture` — so pointercancel, hidden/pagehide
  (ADR-0604/0608), presentation entry (ADR-0634), gesture-to-edit
  (ADR-0637), and Esc (ADR-0094) all reach it transitively. The
  fire path itself re-checks `ptr.down`, drag kind, and
  LONG_PRESS_MOVE_TOL.
- `_wheelZoomEnd` (180ms snapshot-settle): cleared and re-armed on
  every ctrl+wheel — single pending instance, no stacking.
- `_rszT` (150ms trailing resize, ADR-0631): same re-arm idiom.
- `Net._snapT` (deferred snapshot resend, ADR-0452): cleared in
  `Net.init` on every room switch (ADR-0475).
- `Net._presenceTimer`: `clearInterval` before re-arm in
  `Net.init` — no leaked heartbeat across rooms.
- `UI.refreshSaved` 5s interval: permanent app lifetime by design.
- `_rO` blob-URL revoke (10s) / print-window revoke (30s): one-shot
  timers, self-clearing; the URL is the only resource.
- `_saveT` (SAVE_DEBOUNCE): single debounce slot, re-armed per
  schedule — no duplicate saves.

Conclusion: all timers either self-clear, are re-armed through a
single slot, or are cleared on every path that invalidates their
predicate. No leaks, no zombie callbacks.
