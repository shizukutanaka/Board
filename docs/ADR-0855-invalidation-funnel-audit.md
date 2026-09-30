# ADR-0855 — Invalidation-completeness audit: every mutation path reaches its invalidators

**Status:** Complete — no missed invalidation found.

## Context

Board derives at least six surfaces from shape/page state: the spatial hit-test
grid and `byId` index (`_iG` → `_gridVer`), the scene canvas (`_iv`/`_iD`), the
overlay canvas (`_ivO`), the minimap (`_ms`), IndexedDB persistence (`_ps`), and
the page-tab strip (`_pgBar`). The SR DOM mirror, every `_gridVer`-keyed memo
cache, and the undo button piggyback on those. A mutation path that forgets one
produces a stale hit-grid, a missing autosave, or visual residue — the P1 class
this audit hunts.

## Method

Enumerated all ~157 invalidator call sites, then walked every state-mutation
chokepoint — `Store._apply` (commit/applyRemote/undo/redo all funnel through
it), `Store._recordCommitted`, `applyRemote`, `_rs` (wholesale swap),
`_pgAdopt`, `_pgDel2`, `switchPage`, `importBoard`, `importBoardText`, the
shared-link adopt, `backupRestore`, and the `_eraseBatch` restore sites —
checking each reaches the invalidators its change requires.

## Coverage matrix

| Invalidator | Covers | Where guaranteed |
|---|---|---|
| `_iG()` | grid + id-index + `_gridVer` (grid, memo caches, DOM mirror, `byId` size guard) | top of `_apply` (every local/remote/undo/redo op), `_recordCommitted`, `_rs`, `_pgAdopt`, `_pgDel2`, `switchPage`, `_eraseBatch` restores |
| `_iv`/`_iD` | scene repaint, full or damage-rect | `_apply` tail unions per-op damage and picks `_iD` or `_iv`; every `_rs` caller follows with `_iv`; `switchPage` |
| `_ivO` | overlay repaint | `invalidate()`/`invalidateDamage()` set `needOverlay` too — `_iv`/`_iD` subsume it; the 27 direct `_ivO` sites are all overlay-state only (hover/marquee/lasso/presence/search) |
| `_ms()` | minimap reschedule | called inside `invalidate()` and `invalidateDamage()` — every repaint covers it |
| `_ps()` | `Persist.schedule` autosave | `_rdb()` (`_md`+`_ru`+`_ps`) at every funnel tail: `commit`, `_recordCommitted`, `undo`, `redo`, `applyRemote`; wholesale swaps call `_repC` + explicit `_ps` |
| `_pgBar` | page-tab strip | `_apply` tail when `_pgOn`, `_pgAdopt`, `switchPage`, snapshot heal path |
| `_ru` | undo button state | inside `_rdb` |
| `_mirrorSync` | SR DOM mirror | `_gridVer`-keyed rebuild inside `frame()` — cannot outlive the next repaint after `_iG` bumps the version |
| `_sz()` | z-order | every membership-mutating op case and swap path |
| `_pcC` | per-shape cache wholesale purge (pen bitmap/bbox, parked img refs) | `_rs`, `_pgDel2` |

## Verified edges

- **Direct `_sh()` mutations** (push/splice outside `_rs`): all live inside
  `_apply` op-case bodies, covered by the top-of-function `_iG()`, or are the
  deliberate ADR-0026 gesture carve-outs — in-place drag mutation with `_iD`
  damage during the gesture and `_iG` at commit / `_eraseBatch` restore.
- **`_pgHealS` `s.pg` scrubs**: runs only under `state.pages=null` collapse or
  '?'-stub materialization; every caller (`_pgAdopt`, `_pgDel2`, the `_apply`
  tail's `_pgOn()` branch) follows with `_iG`/`_pgBar`.
- **`_ivO`-only sites**: audited all 27 — none mutate scene state.
- **Snapshot/shared-link/backup swaps**: `_rs` + `_pgAdopt` + `_scl` +
  `wclock=_wM()` + `_iv` + `_repC`/`_ps` in every variant.

## Consequence

The funnel is the contract: new mutation paths must enter through
`_apply`/`_recordCommitted`/`_rs`, or replicate the full invalidator tail —
`_iG`, a scene repaint (`_iv` or `_iD`), `_rdb` for persist+undo, and `_pgBar`
when pages are live. The gesture carve-out (mutate in place, damage only) stays
the single sanctioned exception and only inside a live pointer gesture.
