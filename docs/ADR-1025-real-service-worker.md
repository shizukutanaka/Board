# ADR-1025 — The service worker never registered: a real `sw.js` replaces the inline blob

## Status

Implemented.

## Context

The README promises "PWA / 完全オフライン動作" and the app has carried an
offline story since v1.6.5: an inline Service Worker assembled as a `Blob`,
registered via `URL.createObjectURL(blob)`.

`navigator.serviceWorker.register()` requires `scriptURL` (and `scopeURL`)
to have an `http:` or `https:` scheme; for any other scheme the promise is
rejected with a TypeError. This has been true in every shipping browser since
Service Workers exist — the spec authors explicitly declined `blob:`/`data:`
script sources (a compromised origin could then plant a worker that survives
forever with no server file to remove).

The old call was `register(_swu).then(()=>revoke, ()=>revoke)` — a rejection
funnel that simply revoked the blob URL and **silently swallowed the
rejection**. So since the feature's introduction:

- no Service Worker ever registered;
- `install`/`activate`/`fetch` handlers never existed in any browser;
- navigation caching never ran → the advertised "reload offline" never worked;
- `controllerchange` never fired → `_onSwUpdate` was dead code too;
- the `board-v${V}` cache name never existed → no caches to purge.

The app still *works* offline in the only sense that matters for a local file
(`file://` never hits the network anyway), and every feature is client-side —
so nobody noticed. But the hosted path (e.g. GitHub Pages) had no offline
reload at all, and ~700 bytes of the raw budget paid for dead code.

## Decision

- Add a real `sw.js` beside `index.html`. Contents are the same worker as the
  old inline string: `skipWaiting` on install, stale-cache purge + `clients.claim()`
  on activate, network-first for navigations (fresh HTML when online, cache
  fallback offline), cache-first for other GETs caching only `n.ok` responses.
  The cache name is now a fixed `board-sw-v1` (a static file can't read the
  page's `V`; network-first makes the name's staleness harmless).
- `index.html` now calls `navigator.serviceWorker.register('sw.js')`
  with a `.catch(()=>{})` — on `file://` or unsupported contexts it just
  no-ops, same as before.
- The `controllerchange → _onSwUpdate → 'appUpdated' toast` listener is
  preserved; a real SW means it can now actually fire on hosted deploys.
- SW pins in `test.mjs` retarget from inline-HTML greps to `sw.js` contents,
  plus a behavioural pin asserting `register()` is called with `'sw.js'`.

## Contract for new code

`sw.js` must exist and stay a real file — never merge it back inline. Any
registration code must pass an `http(s)`-capable URL; blob/data/object URLs
are spec-rejected. On `file://` the registration rejects silently by design.

## Audit table (sibling surfaces swept this round)

| Axis | Result |
| --- | --- |
| pageName `''` empty-write (docName-1024 sibling) | clean — `_pgRename` aborts on `''`/null; forged `''` on the wire is adopted consistently (cosmetic only) |
| enum-prop value domains in `validPatch` | clean — type/length gated; consumers degrade gracefully & identically on every peer |
| `.board` export↔import completeness | clean — viewport/pages/curPg/docName/shapes all round-trip via `importBoard` |
| search-match page scope | clean — `_sqMatches` gates `_sv(s)&&_pgOk(s)` |
| docName causal marker persistence | clean — `nts`/`ntp` ride the doc record (0695/0699) and restore |
| `_pgFollow` view-stealing | clean — undo/redo-only; remote ops never move the view |
| `dupIds`/`dupDelta` dead-id lifecycle | clean — `smart` requires every live selected shape ∈ dupIds; dead members can't fire |
| `_pgBar` per-op DOM cost on remote bursts | clean — sig-gated rebuild + 64-page bound + `refreshPeers` only |

## Pins (test.mjs)

- `register()` receives `'sw.js'` for every boot evaluation.
- No `serviceWorker.register(_swu` blob path remains.
- `sw.js` exists and contains `fetch`, `navigate`, and `caches` handlers.
- `controllerchange` listener preserved in the page.
