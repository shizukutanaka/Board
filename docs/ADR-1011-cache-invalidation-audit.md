# ADR-1011: derived-cache invalidation audit — key completeness & boundedness

## Status

Audit complete — clean (behavioural pin added, v1.8.037).

## Context

A derived-data cache is correct iff (a) its key covers every input the
derivation reads, and (b) its lifetime/boundedness can't grow stale or
unbounded. This round swept every cache in the file.

## Audit table

| Cache | Key | Lifetime / bound | Verdict |
|---|---|---|---|
| `_wrapCache` (sticky wrap) | text·maxWidth·fontSize·bold·italic·font·spacing | WeakMap per shape object — GC on swap; re-import gets fresh refs | ✓ complete (0437 added spacing; pin now guards it) |
| `wrapTextCached` lineH | — | excluded correctly: line breaks depend on width only, not line height | ✓ by design |
| `_penCache` bitmaps | shape object id | `PEN_CACHE_MAX_PX` 12M px LRU; `_psc`/`_pcC`/`_tTk`/ctx-lost purges | ✓ bounded |
| `_penBboxCache` | shape id | `_psc` per-id, `_pcC` wholesale | ✓ |
| `clearCSSCache` memo | — | `_tTk` on theme/contrast flips (0852) | ✓ |
| `_grpMap` / `_searchCache` | `_gridVer` (+`_sq`) | rebuild-on-dirty | ✓ |
| `Minimap._cache` | `_gridVer` | `invalidateCache` at `_tTk`/ctx-lost/`_rs2` | ✓ |
| conn-label measure memo | spacing-covered (0850) | per-shape | ✓ |
| `Net._imgPending` | img key | `_pcC` wholesale, `_psc` per-id | ✓ |
| `_pinchSnap`/`_panSnap` viewport snaps | — | gesture-scoped, `_clearTouchState`/`resize` clears | ✓ |
| `_snapIndex` / `_mkSnapIdx` | per-gesture sigs | gesture lifetime | ✓ |
| `_imgCache`/`_imgIn`/`_imgSent` | img key | byte-budgeted (0840–0845) | ✓ |
| `state._sbf` slider before-buffer | id+prop | blur/finalize funnel (0962) | ✓ |
| font-loading vs measure | — | **no webfonts** — system stacks only (`--ui-font`/`--mono-font`), no `FontFace`/`fonts.load` | n/a — path doesn't exist |

The one structural note: caches keyed on the **shape object** (WeakMap)
vs **shape id** (Map) — object-keyed caches survive a same-id re-import
without stale hits, since cloned shapes get fresh identities; id-keyed
caches are all covered by `_psc`/`_pcC` at every removal/swap site
(0424/0427/0435/0445/0985).

## Consequences

- Contract: a new derived cache must (1) name its key inputs and include
  every prop the derivation reads, (2) live in a bounded/bucketed store
  or a WeakMap, (3) register with `_psc` (per-id), `_pcC` (wholesale),
  or `_tTk` (theme) when it holds per-shape or theme-derived data.
- Behavioural pin: memo hit under identical inputs; remeasure after
  `s.spacing` changes (regression-guard on key completeness).
