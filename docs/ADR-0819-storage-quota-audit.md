# ADR-0819: Storage, quota & img-queue audit complete

- Status: Accepted (2026-09-28, v1.7.845)

## Scope & Result

Audited the outgoing image-blob queue and every storage/quota surface
— all paths already guarded; no fixes needed.

- `_imgOuts` (outgoing blob queue): accumulated inside `_slimShapes`
  and drained by `_flushImgOuts` on *every* `_slimOp` send and after
  each snapshot build — it can never hold more than one op's images.
  Cleared on room switch (`Net.init`, ADR-0464/0466). Each blob is
  chunked at 64KiB so every `k:'img'` message fits the 256KiB
  `_sendDC` drop bound.
- Quota toasts: `save()` maps `QuotaExceededError` → `quotaExceeded`
  (actionable, not the generic `saveFailed`), per ADR-0227.
- Proactive `quotaWarn` toast: `navigator.storage.estimate()` fires
  inside `save()`, throttled to once per 5min (`_qWAt`), gated on
  usage/quota > 0.8 — warns before writes start failing.
- `estimate()` rejection is `.catch(()=>{})` — no unhandled promise
  (keeps ADR-0814's contract whole).
- `persisted`/`storage` feature probes guard every navigator access.

Conclusion: blob-queue drainage and quota surfacing are complete —
all bounds and toasts already in place and tested.
