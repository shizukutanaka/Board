# ADR-1055: delta snapshot sync on join

Status: accepted (implemented)
Implements: ADR-1048 candidate **P1-b**

## Context

A peer joining a room always received the **full board** as a snapshot —
every shape, every wclock map, every image-ref put — regardless of how much
it already held. For the normal first-join case that is correct (empty
board → adopt). But the same exchange runs on every rejoin:

- BC room switch back to a room the tab already lives in (`Net.init`
  re-fires on room change, boot, and `restoreBackup`).
- Presence-timer `sync-req` retries (≤3) while `_snapRx` is unset — each
  retry triggered a full responder snapshot on every elected peer.
- Rejoins after transient BroadcastChannel misses.

On a busy board (500+ shapes, sizable wclock maps) the redundant bytes are
the largest single message the wire produces, and they are sent by the
*responder* — the peer doing the work — so every unnecessary join starves
the room, not just the joiner.

## Decision

Add a causal horizon to the handshake, keeping the existing machinery:

1. **`sync-req` carries `wc`**: the asker's per-id newest clock —
   `{id: newestClock}` derived from `state.wclock` (`_syncReqWc()`). One
   clock per id, not per prop; any prop clock newer than it means the
   asker is behind on that shape.
2. **`_reqWc(msg)` sanitizes the horizon** at the responder: object, ≤
   `SHARE_MAX_SHAPES` keys, `_idOK` ids, `validClock` values. Any
   malformed entry → `null` → the responder sends the unchanged full
   snapshot. A lying asker only starves itself.
3. **`_snapshotMsg(req)` filters**: a shape's add-op is sent only when the
   asker's horizon has no entry for it, or some prop clock in our
   `_wc()[id]` is `clockNewer` than the asker's entry. Tomb deltas ride a
   new `dels` map: `{id: delClock}` for every asker-held id whose
   responder-side wclock carries a newer `_del`.
4. **Receiver side** (non-empty-board merge branch): `msg.dels` entries
   are applied with `del` parity — splice the live shape (unless locked
   or born-newer), land the `_del` clock for future arbitration, purge
   per-shape caches (`_sdl`/`_psc`), and run `_remoteDelConnFix` so
   gap-bound connectors unbind exactly as they do for a wire `del` op.
   `_applySnapshot` is unchanged and unreachable here (delta implies a
   non-empty asker).

## Why the horizon is per-id-newest, not the swap marker

`_lastRep` marks the winning `replace` generation — useful for ordering
whole swaps (ADR-0617) but too coarse here: a peer that joined before the
last swap and kept pace via ops would be forced into another full
snapshot. Per-id newest clocks describe the asker's actual coverage
finely enough that the responder sends only the true gap. The tomb side
needs the same granularity (the asker may hold ids the responder deleted
long after the last swap).

## Backward compatibility

- Old asker → new responder: no `wc` field → `_reqWc` → `null` → full
  snapshot (current behaviour).
- New asker → old responder: `wc` ignored → full snapshot.
- Either side old on receive: `dels` ignored.
- Bounded: a horizon over `SHARE_MAX_SHAPES` keys degrades to a full
  snapshot rather than a truncated one.

## Consequences

- Join traffic on rejoin shrinks from O(board) to O(delta). First joins
  are unchanged.
- The horizon doubles as the responder's tomb-filter, so deletions the
  asker missed now converge on the same message that adds the shapes it
  missed — previously a deleted-id stale shape could only heal via a
  later wholesale event.
- Costs: `sync-req` gains up to ~`SHARE_MAX_SHAPES × ~50B` on a giant
  board; the responder does one `_wc()` pass per request (throttled by
  `_sendSnapshot`'s existing 1s window).
- Contract for new work: any state the asker can be *behind* on must be
  expressible in wclock terms to ride the delta; genuinely new kinds
  still belong in the full-snapshot body.
