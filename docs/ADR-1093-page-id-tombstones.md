# ADR-1093 — page-id tombstones over the delta channel (Gap B, ADR-1091)

## Status

Implemented (v1.8.117, round843).

## Problem (ADR-1091 Gap B)

`pageDel` tombed the *member shapes* of the deleted page (`_wD` on each shape id)
but never the **page id itself**. A joiner that kept a stale copy of page `p2`
and asked for a delta sync received a snapshot response whose `msg.pages` union-
heal re-added `p2` as a zombie: the page id is a different key space than shape
ids, so no member tomb covered it. The joiner's deleted page survived forever.

The same applied to the wholesale `replace` op: dropped page ids vanished from
`op.pages` but left no tomb, so nothing prevented a later union-heal or an older
peer's page set from resurrecting them.

## Decision — page ids ride the existing `_wD`/`_bT`/`_bN` machinery

Page ids are already namespaced distinctly (they can't collide with shape ids in
practice — both are caller-supplied strings, but the sets never overlap in
valid documents). Reusing the shape tomb machinery gives page tombs a wire
channel **for free**: `sync-req` carries a `wc` horizon that iterates *all*
`state.wclock` entries, and `_snapshotMsg` emits `dels` for ids the asker has
stale entries for. With the emit filter widened from `!byId(id)` to
`!byId(id)&&!_pgById(id)`, page-id tombs flow over `msg.dels` with zero new wire
fields.

### Changes

1. **`_pgDel2` tombs the page id itself** — `_wD(op.id,op.clock)` alongside the
   member tombs, so the del apply writes the page tomb into `state.wclock`.

2. **`replace` forward tombs dropped page ids** — `pg0` (the pre-swap page set)
   is captured before the wipe; each `pg0` id absent from `op.pages` gets
   `_wD(p.id,op.clock)`.

3. **`dels` emit carries page tombs** — `_snapshotMsg` adds `!_pgById(id)` and
   the `!_bN` reborn suppression so a live page never ships a tomb.

4. **`dels` intake kills zombie pages** — a dead-id entry whose id resolves via
   `_pgById` and isn't born-newer splices the page, rehomes members via
   `_pgDel2`, and clears `pages`/`curPg` when the last page dies.

5. **`msg.pages` union-heal is tomb-gated** — a page id with a newer `_del` and
   no newer `_born` is skipped; adopted pages born-stamp
   `_bT(p.id,{ts:p.nts||0,peer:_iS(p.ntp)?p.ntp:'',seq:0})` so the peer's own
   heal outlives older tombs.

6. **Born-stamps on every introduction path** — `pageAdd` forward,
   `pageDel` undo (re-insert), `_pgAdopt` (wire sites pass `op.clock` or
   `_pgClk(msg)` — a born clock derived from `msg.rep` or a fresh local clock)
   so a resurrected page outranks its stale tomb.

### `_pgClk` asymmetry (documented)

Wire-driven `_pgAdopt` sites (snapshot intake `case 'snapshot'`,
`_applySnapshot`, IDB doc restore) pass a clock so adopted pages earn `_born`.
Local doc-switch sites (`importBoard`, hash import, backup restore) pass none:
they reset `state.wclock=_wM()` immediately after adoption, which would wipe any
stamp anyway — the asymmetry is load-bearing, not an oversight.

## Consequences

- A joiner's deleted page now converges: `dels` kills it on the way in, and
  union-heal cannot re-add it.
- A `replace` that drops a page emits tombs for it, closing the same zombie
  window on the wholesale path.
- Reborn pages survive: `_bN` suppression on emit and intake, plus born-stamps
  on every introduction path, mean a page resurrected after a tomb was issued
  keeps living.
- Zero new wire fields — the delta channel (`dels`) already existed; this PR
  only widens which ids it covers.

## Tests

test.mjs `ADR-1093` block (12 asserts): pageDel page-id tomb, `dels` emit,
joiner splice + member kill, union-heal tomb gate, born-newer suppression in
both directions, `pageAdd` born-stamp, `pageDel`-undo rebirth, `replace` page-id
tomb.
