# ADR-1090: Per-shape cache × removal-path purge parity

**Status:** Accepted (audit complete — clean, contract pinned)
**Date:** 2026-10-01
**Round:** 840

## Context

The board keeps several in-memory stores keyed by **shape id**. If any of them
outlives the shape it describes, the stale entry is either leaked memory, a
wrong-cache hit for a recycled id, or a dangling img-ref waiter that spams imgq
re-requests forever. This audit mapped every id-keyed store against every
shape-removal path and verified a purge (or an equivalent guarantee) on each
crossing.

## The stores

| Store | Keyed by | Purge primitive |
| --- | --- | --- |
| `_penCache` | shape id | `_psc(id)` / `_pcC()` |
| `_penBboxCache` | shape id | `_psc(id)` / `_pcC()` |
| `Net._imgPending` | shape id | `_psc(id)` / `_pcC()` (+ `_pcR()` re-park) |
| `_idIndex` (byId map) | shape id | rebuilt on `_invalidateGrid` (`_idIndex=null`) |
| `_wrapCache` | shape object (WeakMap) | GC — dies with the object |
| `_imgCache` / `Net._imgSent` / `Net._imgIn` | content fingerprint / blob key | not shape-keyed; LRU + byte bounds (ADR-0842/0784/1040) |
| `state.hover` / `state.dupIds` / selection | id reference | `byId` null-guard / `_sdl` on every removal |
| wclock tomb map | shape id | intentional — `_del` tombs are the anti-resurrection contract (ADR-0734) |

## The removal paths

Every path that removes shapes runs one of the two purge primitives:

- **Per-id** — `_psc(id)` clears `_penBboxCache` + `_penCache` (keeping the
  `_penCachePx` byte accounting honest) + `Net._imgPending`: remote `del`
  forward, `add`/`addMany` backward (undo), `eraseAt` batch members, `pageDel`
  member kills.
- **Wholesale** — `_pcC()` clears all three maps, then `_pcR()` re-parks the
  img refs of *surviving* shapes: `replace` forward, `_rs` (snapshot/import/
  load/backup doc-switch), `_pgDel2` wholesale swap. `clear` runs `_pcC()`
  alone — nothing survives to re-park.
- **Restore direction** — any path that brings a shape back (`del`/`add`/`addMany`
  backward, undo, `_attachShape` installs) re-parks its `img` ref through the
  same `_oa`/`_attachShape` gate, so a resurrected shape re-enters the imgq
  lifecycle instead of waiting on a stale pending entry.

## The safety net

Two mechanisms heal a missing `_imgPending` entry even if a removal path is
ever missed:

- `_imgRescan` (5-min sweep, ADR-1049) re-parks every live shape whose `img`
  ref is unresolved.
- The blob-arrival fallback sweeps `_sh()` for `s.img===key` and resolves the
  shape directly, pending entry or not (ADR-0629).

`state.hover`, `state.dupIds`, and selection sets hold *references*, not cached
state — a dead id fails `byId` and degrades to a no-op (hover skip, smart-dup
chain break, `_sdl` removal on the removal path). Gesture-scoped maps
(`ptr.dragStartShapes`, `gOrig`, exporter locals) die with their gesture/call.

## Decision

No code change — the parity already holds on every path. The contract is pinned:

1. Any new per-shape id-keyed store MUST be added to both `_psc` and `_pcC`.
2. Any new shape-removal path MUST call `_psc` per removed id or `_pcC`
   wholesale (+ `_pcR` when survivors exist).
3. `Net._imgPending` entries are keyed by *shape id*; ref re-park after restore
   rides `_attachShape`/`_oa` — never write a pending entry keyed by blob key.

## Behavioural pins (test.mjs, 10 asserts)

- remote `del` purges all three id-keyed stores for the removed id; unrelated
  entries survive a targeted del
- `addMany` undo purges every removed id
- `replace` wipes every store via `_pcC` and `_pcR` re-parks only live img refs
- `_imgRescan` re-parks a live unresolved ref whose pending entry vanished
- `pageDel` member kill purges per-id caches
- wholesale paths pair `_pcC` with `_pcR` (source pin)
