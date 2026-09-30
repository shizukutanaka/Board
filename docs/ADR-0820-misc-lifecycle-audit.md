# ADR-0820: RTC / history / misc lifecycle audit complete

- Status: Accepted (2026-09-28, v1.7.846)

## Scope & Result

Audited the remaining unexplored lifecycle surfaces — all clean by
design or already bounded; the spec backlog is empty.

- RTC across a room switch: `Net.init` deliberately keeps the live
  `rtc`/`dc` link — the WebRTC channel is a manual 1:1 invite pair,
  independent of BroadcastChannel rooms, and the `rtc:` presence row
  is preserved by design. `_wrtcInit` closes the previous
  `RTCPeerConnection` before creating a new one; the channel is
  never orphaned.
- `state.history`: capped at `MAX_HISTORY` — on overflow the array
  shifts and `histIdx` stays pointed at the head (the `else` branch
  is the only `histIdx++`), so truncation can't corrupt the cursor.
- `_imgIn`/`_imgInB`: 64MiB byte cap + 256-entry cap, pinned
  behaviourally; `_imgOuts` drains per send (ADR-0819).
- Pinch state (`_pointers`/`_gScale`/`_pinchSnap`/`_pinchVp`):
  `_resetPinch` on pointerup/pointercancel and gesture-cancel paths
  clear it (ADR-0636/0641 pins).
- No `document.fonts`/`FontFace` usage — system fonts only, nothing
  to leak.
- Spec §14.3.1 backlog: P1/P2 all DONE; remaining P3 rows are
  deferred *by decision* (z/frac 一本化 rejected in ADR-0001 Step4;
  whole-doc put is the accepted persistence tradeoff). Nothing
  actionable remains.

Conclusion: the lifecycle surface (RTC, history, image queues,
pinch, fonts) is complete; the documented backlog is closed.
