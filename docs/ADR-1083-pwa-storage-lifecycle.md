# ADR-1083 — PWA & client-storage lifecycle, audit complete

- Status: audit complete, contract pinned (v1.8.107, round833)

## Context

After ADR-1025 made the service worker a real file, its cache lifecycle became
the freshness boundary for the whole app — a stale cache would freeze every
user on an old build. This audit covers the SW policy plus every
client-side storage bucket (`localStorage`, IDB — GC audited in ADR-1082).

## Verified clean

| Surface | Contract |
|---|---|
| SW navigation fetch | **network-first**: `mode==='navigate'` always `fetch()`es; a fresh `index.html` is served online and re-cached on success. The static cache name `board-sw-v1` is safe *because* navigations never hit cache online |
| SW offline path | `fetch` rejection → `caches.match` (last-good HTML); missing → `new Response('offline',{status:503})` |
| SW non-navigation GET | cache-first, only `n.ok` responses stored — fine for a single-file app whose only real subresource is itself |
| SW `activate` | deletes every cache `k!==C`, then `clients.claim()`; `install` runs `self.skipWaiting()` — a new worker takes over immediately, never waiting for all tabs to close |
| `localStorage` | scalar keys only (`THEME_KEY`, room secret — ADR-1056); bounded by construction, `removeItem` parity on theme reset |
| IDB `docs` store | single `DOC_KEY` + `:prev` backup slot (ADR-1017) |
| IDB `imgs` store | GC'd against live+backup refs each save (ADR-1082) |

## Pinned (test.mjs, 5 asserts)

- navigations fetch fresh HTML first (`mode==='navigate'` + `fetch().then`)
- `activate` purges old caches + `clients.claim()` + `skipWaiting()`
- offline navigation falls back to `caches.match`
- theme key lifecycle is get/set/remove bounded; `localStorage` writes are
  const-key scalars

## Consequence

The freshness boundary is contract-pinned: online loads always get the newest
`index.html`, a new worker takes over immediately, and no client storage bucket
can grow unbounded.
