# ADR-1082 — session-accumulation bounds, audit complete

- Status: audit complete, contract pinned (v1.8.106, round832)

## Context

Every in-session accumulator must be bounded or lifecycle-cleared, or a long
session degrades. This audit walked the local accumulation surfaces that are
*not* wire-intake (that domain closed in ADR-1081).

## Verified bounded

| Surface | Bound / lifecycle |
|---|---|
| `state.history` (undo stack) | `MAX_HISTORY=500`; both push paths (`Store.commit`, `applyRemote`) shift at cap; `histIdx` stays at the tip |
| `_pointers` | deleted on `pointerup`/`pointercancel`; `clear()` on window blur (ADR-0534/0950); size ≤ live contacts |
| IDB `imgs` blob store | GC on every `save()`: keeps blobs referenced by the live doc or the `:prev` backup; all others `imgs.delete(k)`. Blobs referenced only by history ops are dropped by design — an undo restore re-parks the ref and imgq heal re-fetches it (ADR-0841/1043) |
| `state.peers` | `MAX_PEERS=32` + `NET_PRESENCE_TIMEOUT` reap |
| `state.shapes` | `MAX_OP_SHAPES=200000` ceiling at every intake path (ADR-1079) |
| `seenOps` dedup set | `_trimSeen` on commit/applyRemote |
| `wclocks` map | flood cap preserves tombstones (ADR-0738) |
| `_dcQ`/`_dcQB` send backlog | byte + count caps (ADR-0432/1062), cleared on link supersede (ADR-1059) |
| `_imgPending` waitlist | 256 FIFO (ADR-1046/1078) |
| `_imgIn`/`_imgSent` blob stores | count + byte caps (ADR-0449/0784/0842) |
| toast stack | 4 (ADR-0879) |
| `_imgCache` decoded bitmaps | 60-entry LRU, content-addressed (ADR-1047) |
| `state.pages` | pageAdd ≤64 (ADR-0834) |
| `p.sel` peer selection | existence filter + 4096 (ADR-1080) |

## Pinned (test.mjs, 5 asserts)

- `Store.commit` beyond `MAX_HISTORY` shifts (length stays 500, `histIdx` at tip)
- `Net._onRecv` op path identical
- `_pointers` delete-on-up/cancel + clear-on-blur (source pins)
- IDB `imgs` GC `!live.has(k)` delete (source pin)

## Consequence

The session-accumulation domain is closed: every local list/map/store is either
capped, lifecycle-cleared, or self-healing. Nothing grows unbounded in a long
session.
