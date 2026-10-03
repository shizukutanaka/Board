# ADR-0927: born parity — every (re)introduction stamps the same clock remotes use

## Status

Accepted (2026-10-01)

## Context

ADR-0926 gave every id an existence clock (`wclock[id]._born`) under the same
`clockNewer` total order as the property LWW, and made kill paths gate on it.
But three (re)introduction routes still stamped no usable born:

1. **Snapshot adopt** (`_applySnapshot`, empty-board fast path) ignored
   `msg.ops[].wc` entirely — adopted shapes had no `_born` at all, while every
   peer that took the merge path (or authored the shapes) had real clocks.
   A stale `del` later deleted the shape only on the joiner.
2. **Snapshot merge, unknown shape** (`_mergeSnapshotOp` `!ex` branch) ran the
   synthetic add under the snapshot's own `ts:0` clock instead of the sender's
   carried clock — the `_born` it stamped could never outrank a real tomb.
   For a *known* shape the merge loop skipped every `_`-prefixed key, so the
   sender's `_born`/`_del` never merged either.
3. **Local wholesale swap** (`_recordCommitted 'replace'` — .board file /
   share-link / backup imports) wiped `wclock` and recorded removals, but
   never stamped `_born` on the new set — while every remote receiver of the
   broadcast `replace` op did (`_bT` on all post-swap ids). A `del` older than
   the swap clock then deleted on the importer's own board and lost
   everywhere else.

A subtler consequence of carrying clocks: a tomb and a birth can coexist —
`wclock[id]` may hold `_del` *and* a newer `_born` (the sender deleted, then
re-introduced). The old filter (`w._del` presence) treated any tomb as live
forever, so adopt dropped shapes the sender had resurrected — same
one-peer-dead divergence from the other direction.

## Decision

- `_wAdopt(id,rw)`: adopt a snapshot-carried wclock map — keep-newer per key
  (`validClock` per entry, ≤64 keys, structural/`__proto__` keys skipped),
  `_born`/`_del` included. Called for every snapshot-adopted shape and for
  the merge-add path *before* `applyRemote`, so the sender's real born is in
  place when the tomb gate runs.
- `_tAlive(id,rw?)`: a tomb is live only while no newer birth supersedes it —
  either in the local map or in the incoming carrier (`rw`). Replaces the
  bare `._del` check in the adopt filter; `_tmb` gains the same supersession
  so an add gated by a stale tomb still lands.
- `_mergeSnapshotOp` merge loop adopts `_born`/`_del` keep-newer alongside
  property clocks (persisted via `_ps()`).
- `_recordCommitted` `replace` stamps `_bT(id,op.clock)` on every `op.after`
  id — the exact stamp the wire path applies on receivers, so the local peer
  arbitrates the swap's kill/restore the same way.

## Consequences

A del that lost the causal ordering now loses on *every* peer regardless of
which intake route re-introduced the shape — snapshot join, union-heal merge,
or a local board swap. Behavioural pins cover: snapshot adopt carries the
sender's born, stale del loses post-join, a newer birth supersedes a stale
local tomb, merge adds keep the real born, and the local swap's born beats a
stale remote del.

## Pins

`node test.mjs` — 8 behavioural asserts (ADR-0927 block): adopt wc, tomb
supersession, stale-del loss on both snapshot paths, and the `_recordCommitted`
born stamp holding against a stale remote `del`.
