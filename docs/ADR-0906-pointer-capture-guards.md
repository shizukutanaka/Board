# ADR-0906 — Guard setPointerCapture calls

## Status

Accepted — implemented.

## Context

Runtime-API audit (round655) verified every optional browser API is either
feature-detected or inside try/catch — `DecompressionStream`, `CompressionStream`,
`crypto.subtle` (`Share.canEncrypt` callers), `BroadcastChannel`,
`RTCPeerConnection` (explicit error → caller toasts), `OffscreenCanvas`
(fallback canvas), `crypto.randomUUID` (base36 fallback in `uid()`),
`window.matchMedia`, `getPredictedEvents`, `navigator.storage.persist`,
`navigator.clipboard` (`isSecureContext` + `copyUnsupported` toast),
`navigator.wakeLock`, `indexedDB` (Promise-executor throw → rejected promise
caught by the caller).

The one asymmetry: `setPointerCapture` was unguarded at both call sites while
its partner `releasePointerCapture` was already inside try/catch.

## Problem

`setPointerCapture(pointerId)` throws `NotFoundError` when the pointerId is
not an active pointer (stale id from a cancelled/suppressed sequence, some
edge touch cancellations). The throw propagates out of the listener:

- `canvas` pointerdown (line ~4047): aborts gesture arming entirely — the
  stroke/drag the user started is silently dropped.
- `minimap` pointerdown (line ~10281): aborts the scrub before `_mmGo`.

## Decision

Wrap both calls in `try{…}catch(_){}` — pointer capture is a convenience
(off-element tracking); a failed capture must not kill the gesture itself.
Matches the already-guarded `releasePointerCapture` on the next line.

## Pins

Behavioural: stub `canvas.setPointerCapture`/`mc.setPointerCapture` to throw,
then real `pointerdown` dispatch still arms `ptr.down`+pen draft, and a
minimap PD+PM still scrubs the viewport (requires a `Minimap.draw()` first —
`_mmGo` no-ops until `_renderScene` sets `_sc`).

## Non-issues confirmed (the rest of the audit)

- `Persist.open` uses `indexedDB.open` inside a Promise executor — a missing
  API rejects rather than throws synchronously; caller catches.
- `Share.canEncrypt` gates every `crypto.subtle` path (8573/8611/9238);
  insecure-context share links degrade to plaintext-with-warning or toast.
