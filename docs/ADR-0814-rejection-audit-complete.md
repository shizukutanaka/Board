# ADR-0814: Async rejection-safety audit complete

- Status: Accepted (2026-09-28, v1.7.840)

## Decision

Audit of every promise surface confirms rejections cannot hang or go
unhandled:

- Persist: `reqDone`/`txDone` reject on request error and transaction
  abort; `open()` rejects; `save()` is body-wrapped → `_saveErrMsg`
  (quota-aware toast); `load()` is caught by the `main()` caller;
  backup ops (`saveBackup`/`check`/`discard`/`restore`) each carry
  their own try/catch; `requestDurable` and `_quotaWarn` swallow.
- Clipboard: `copyText` falls back to `execCommand` and returns a
  boolean every caller turns into a toast; `clipboard.write` uses
  `.then(ok, fail→toast)`; `writeText` rejection falls through to the
  fallback.
- WebRTC: `wrtcCreateOffer`/`wrtcAcceptOffer`/`wrtcConsumeAnswer`
  callers all `catch(e)→_e(_St(e))`.
- Wake lock, install prompt, share export, `Share.importFromHash`,
  `inviteFromHash` — all caught at their call sites.

No changes; recorded so the next audit doesn't re-walk the surface.
