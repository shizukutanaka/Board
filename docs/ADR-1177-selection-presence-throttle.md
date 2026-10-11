# ADR-1177: selection presence rides the cursor throttle

## Status
Accepted (v1.8.201). Fix; completes the presence send-side rate-cap parity
started by ADR-0010 (cursor `CURSOR_THROTTLE_MS=60`).

## Question
`sendSelectionIfChanged` dedups by serialized key (ADR-0680/0860), but the
render-loop hook at 2582 invokes it every frame. During a marquee drag the
selection set mutates per frame — does dedup alone bound the wire rate?

## Audit
No. Dedup only collapses *unchanged* keys; a marquee drag changes the id set
every rendered frame, so each frame emitted the full selection-id array —
~16–60 messages/s for the drag's duration, the only unthrottled presence
send. `sendCursor` caps its rate at `CURSOR_THROTTLE_MS`; selection had no
equivalent.

## Decision
Mirror the cursor throttle inside `sendSelectionIfChanged`:

- On a changed key inside the window, skip the send and arm a single
  trailing timer (`_selT`, `CURSOR_THROTTLE_MS`). The dedup key is NOT
  advanced on a skip, so the timer's retry — and every subsequent frame —
  sees the still-changed key and the latest (settled) selection lands within
  one window. Mid-drag updates coalesce to the newest value; nothing is
  lost (selection presence is latest-wins, not evented).
- `_touchPeer` additionally clears `_lastSelAt`: a latecomer's forced resend
  must reach the new peer immediately, not after a throttle window it never
  observed.
- Deselect (empty ids) flows through the same path — an empty array is a
  normal send, throttled like any other change; the trailing resend delivers
  the cleared highlight within one window.

## Consequences
- Per-frame presence traffic during marquee drops from ~60/s to ≤~16/s,
  matching cursor sends; the final selection is delivered by the trailing
  resend within `CURSOR_THROTTLE_MS` of settling.
- Pins: 2 source + 5 behavioural asserts (throttle gate, trailing resend
  arm, coalescing, post-window landing, immediate first send);
  `this._lastSelSent=null;this._lastSelAt=0;_iv();` recalibrates the
  ADR-0011/ADR-1031 latecomer literals.
