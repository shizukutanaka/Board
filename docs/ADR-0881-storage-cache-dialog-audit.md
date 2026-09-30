# ADR-0881 — storage/cache/dialog/error-path audit complete

## Status
Accepted · recorded v1.7.907

## Context
The broad intake/bounds/parity axes are closed (ADR-0777–0872). This record
covers the residual "host-API failure surface": what happens when storage,
crypto, encoding, cache, or a blocking dialog API fails or misbehaves —
paths a hostile peer cannot reach but a degraded browser (private mode,
quota exhaustion, sandboxed iframe) can.

## Findings — all clean

- **localStorage**: every `_lg`/`_ls` call site is try-wrapped (peer id,
  minimap, theme, lang). `PEER_ID` falls back to `uid()` on total storage
  denial — the app still boots.
- **IndexedDB / Persist**: `open` rejects into the boot `try` (warn only,
  empty board); `save` wraps the whole transaction and maps
  `QuotaExceededError` to a distinct toast; `load`, `saveBackup`,
  `checkBackup`, `discardBackup`, `restoreBackup` are all internally
  try-wrapped — no rejection escapes.
- **crypto.subtle**: `exportToUrl` rejections surface via the
  `shareExportFailed` toast; `importFromHash` handles missing key, missing
  subtle, bad key, and malformed payload — every reject path toasts AND
  clears the hash (ADR-0038 rule).
- **Encoding**: `atob`, `btoa`, `encodeURIComponent`,
  `decodeURIComponent` — every site is inside a try (share hash, drawio
  inflate) or operates on self-generated data.
- **Window/document sinks**: `exportPDF`'s `document.write` interpolates
  only a `blob:` URL (no injection) and an `_esc`'d doc name; popup-block
  toasts; blob revoke on a 30s timer. No `eval`, `new Function`,
  `innerHTML=`, or `insertAdjacentHTML` in production code.
- **Blocking dialogs**: `prompt`/`confirm` results are bounded at intake
  (page rename `_s80`, link `_trm().slice(0,500)` + `^https?://` gate) —
  producer parity with the wire bounds.
- **BroadcastChannel**: `postMessage` try-wrapped; `onmessage` funnels
  through `_onRecv` validators.

## Decision
Record the audit conclusion. No code change — every host-API failure path
already fails closed (toast + safe default, never silent divergence).
