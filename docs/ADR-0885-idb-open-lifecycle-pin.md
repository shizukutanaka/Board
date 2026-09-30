# ADR-0885 — IDB open lifecycle behavioural pin + tx error audit

## Status
Accepted, v1.7.911 (test-only)

## Context
ADR-0884 added two handlers to `Persist.open()` — `onblocked` (resolve
in-memory when a stale tab holds an older version) and `onversionchange`
(yield the connection to a newer tab's upgrade). Source pins checked the
code was written, but nothing fired the handlers end-to-end: a future edit
could have installed them while forgetting to resolve, or cleared `db`
without closing the connection.

Separately, this round audited the IDB transaction error surface and the
BroadcastChannel message-error path.

## Audit findings (clean)

- **Every write transaction** (`save`, `saveBackup`, `restoreBackup`,
  `checkBackup` paths) is awaited through `txDone(tx)`, which resolves on
  `oncomplete` and rejects on both `onerror` and `onabort` — IDB aborts a
  transaction without firing `onerror` on it, so both handlers matter.
- **Every request** is awaited through `reqDone(rq)` (`onsuccess` → resolve,
  `onerror` → reject). Read-path failures surface at `main()`'s
  `console.warn('persist init', err)` catch.
- **Back-pressure and size errors** (quota, 16MB dataUrl overage) are
  caught in `save()`'s try/catch → `_saveErrMsg` → quotaExceeded or
  saveFailed toast.
- **`bc.onmessageerror` is unreachable.** The channel only ever carries
  `postMessage(msg)` of `_mk`-built plain objects — always structured-
  cloneable, so a deserialization failure cannot occur on our sends. A
  foreign poster's malformed clone would hit `onmessageerror`, but no
  handler is required: the message is dropped by the browser and our
  `bc.onmessage` never sees it, which is already the safe outcome.

## Decision

Add a behavioural test block that swaps `fakeWin.indexedDB.open` for a
controllable fake request, then:

1. fires `req.onblocked()` → `Persist.open()` resolves (does not hang)
   and `Persist.db` stays `null` — saves become safe no-ops;
2. fires `req.onsuccess()` → `db` binds, then `db.onversionchange()`
   → the connection's `close()` runs and `db` clears to `null`.

The pins sit beside the `_saveErrMsg` block, reusing the harness's
existing `fakeWin.indexedDB` injection — no new stub layer needed.
