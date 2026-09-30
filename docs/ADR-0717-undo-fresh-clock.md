# ADR-0717: undo arbitrates via the fresh undo-wire clock

## Status
Accepted (実装済)

## Context
`undo()` ran the local backward apply under the **original commit clock** while
the undo-wire ops broadcast to peers were stamped with a **fresh clock** by
`_fck`. Both sides evaluate "does the undo beat the last writer?" — but against
different clocks:

- Local: `_lwwSkip(id,key,op)` compares the last writer's wclock against
  `op.clock` — the ORIGINAL commit clock (old ts).
- Peers: `_lwwDrop` compares the last writer's wclock against the wire op's
  FRESH clock (new ts).

A remote write landing between the commit and the undo therefore **won locally**
(`clockNewer(remote, oldCommitClock)` → skip the restore) yet **lost remotely**
(`clockNewer(freshWireClock, remote)` → apply) — a per-property split-brain:
local keeps the remote value, peers apply the reverted value.

## Decision
An undo IS a new competing write. `undo()` now restamps `op.clock` fresh before
`_apply(op,false)`, and every `_undoWire` op gets `{peer,seq:++state.seq,ts:T}`
with the SAME `T` — identical `(ts,peer)` on both sides → identical arbitration
outcome. (Seqs differ per wire op so dedup still keys them apart; arbitration
never reaches seq because the writers' peers differ.)

Two latent defects this surfaced and fixed in the same change:

1. `_undoWire` for `upd`/`style`/`resize`/`align` emitted `{after:op.before}`
   **without `before`** — `validRemotePayload` requires `patches(op.before)` on
   those kinds, so peers rejected the op wholesale: the style-family undo-wire
   has been dead on the wire since ADR-0443. It now carries
   `before:op.after` — also the correct `_chg` baseline (peers arbitrate only
   the keys the undo actually touches).
2. `_slimOp` passed `before`/`after` patch arrays through unstripped — a shape
   that was ever locked keeps a `locked:null` key on its full-shape patch
   snapshot, and the receiver's `noLock` gate then rejected the WHOLE op
   (silent forward-path drop too, not just undo). `locked` is now stripped
   from `style`/`resize`/`align` patch arrays when `op.dir!=='lock'` (the lock
   path legitimately writes `locked`).

## Consequences
- Semantics change: undo now WINS the LWW race on both sides (it is the newest
  write). Previously it silently half-lost: peers reverted, local didn't.
- Behavioural pins updated to assert the converged value on BOTH peers.

Test: `node test.mjs` — two-peer undo sequences (resize, group, upd) assert
identical winner + matching wclock writer on both sides.
