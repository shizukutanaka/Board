# ADR-0992: stale-reference × removal-path completeness audit

- Status: Accepted, audit complete — no defect found (round741 — docs + pin)
- Date: 2026-10-01
- Round: 741

## Context

A shape can disappear through many paths: `del`, `add`/`addMany` backward
(undo), eraser splice, `clear`/`replace`/`_rs` wholesale swaps, `pageDel`
member kills, and remote arrivals of the same. Anything that *keeps looking
at* the shape — cached bitmaps, selection, editing overlays, presence,
timers, closures — must either

(a) **re-resolve by id** every use (a dead id reads as `byId → null`), or
(b) be **purged at the remove site** (`_psc(id)` / `_pcC()`).

A third invariant underlies both: every op reaching `Store._apply` must carry
a clock, because tomb/born arbitration compares `op.clock` against `_wc()` —
a clock-less op would silently mis-arbitrate.

## Audit (eight axes, all clean)

**Editing overlays fold.** The text editor's blur commit gates
`!byId(s.id)||_lk(s)` (5658, ADR-0556/0967); the frame fold gates
`!s||_hd||_lk||!_pgOk` (5727); the label editor gates at 4552/4592; the
slider before-buffer `_sbf` gates `s&&!_lk(s)` at 9523-9525 (ADR-0962). Any
removal path funnels through `byId → null` and the overlay folds without
producing a phantom op.

**Presence skips dead ids.** `drawPeerSelection` checks
`const s=byId(id);if(!s||_hd(s)||!_pgOk(s))continue` (2777-2778) — a peer's
stale selection id renders nothing.

**Timers hold no stale shape.** Every `_stO` site re-resolves live state or
captures coordinates only (ADR-0817, re-verified).

**The id index cannot go stale.** `_apply` calls `_iG()` at its head (1607)
for every op in both directions; the only `state.shapes=` sites (2097 `_rs`,
2155) also `_iG()`. `byId`/`_idIdx` is a live linear `findIndex` (2192) —
there is no materialized id index to fall out of sync (ADR-0009).

**`_opIds` harvest is complete.** It scans `op.id`, `op.ids[]`, and carrier
keys `['shape','shapes','before','after','changes','connClears']` — covering
all 17 op kinds' touched ids; shared with `_pgFollow` (2106-2118).

**Every `_apply` entry is clock'd.** `commit` fabricates via `_fck` (1422),
`applyRemote` rejects clock-less/invalid clocks via `validClock` (1464-1466),
undo (1584) and redo (1600) fabricate fresh clocks. Dedup keys
`_ck=peer:seq` (890) are collision-safe across boots because `peerId` carries
a per-boot incarnation suffix (1157, ADR-0459).

**Per-shape caches are purged on every removal path.** `_psc(id)` clears
`_penBboxCache`/`_penCache`/`Net._imgPending` for one id (2194,
ADR-0427/0435): called on every `del` splice (1631/1640/1652) and the eraser
splice (5757). `_pcC()` purges the same family wholesale + `_pcR()` re-parks
surviving img refs (2095, ADR-0985): called from `_rs` (2097), `clear`,
`replace`, and `pageDel`'s member kill inside `_pgDel2`. No path leaves a
stale bitmap/pending-blob entry for a reborn id to inherit.

**Kill paths drop selection + fold the view.** `del`/`pageDel` `_sdl(id)`
the selection, `switchPage` lands the view, `_pgAdopt` re-validates
selection — no dead id can linger in `state.selection` to produce ops on.

## Pin

`test.mjs` (ADR-0992 block): (1) `Store.applyRemote` drops a clock-less
`add` — the gate is behavioural; (2) `Store.commit` stamps a fresh
`(peer,seq,ts)` clock on the op before apply; (3) `_psc(id)` clears the whole
per-shape cache family (`_penCache` + `Net._imgPending`) for that id;
(4-5) `eraseAt` splices the hit shape out of the scene AND purges its cached
pen bitmap — a reborn id never renders a stale bitmap. 5 asserts.

## Consequences

The "shape disappeared" class is comprehensively closed by construction:
removal funnels through `byId → null` (live-resolution references fold) and
through `_psc`/`_pcC` (materialized caches purge). The pins fail loudly if a
future removal path skips the purge, or if a new intake bypasses the clock
guarantee.
