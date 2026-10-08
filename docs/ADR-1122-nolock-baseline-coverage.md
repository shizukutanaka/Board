# ADR-1122: 'locked' gated on every patch baseline — upd/move forged-key closure

## Status
Accepted (implemented).

## Context — audit axis (round872)
`validRemotePayload` reserves the `locked` prop for the dedicated `align
dir:'lock'` op: every patch family rejects a `locked` key so a remote peer
cannot flip locks through a disguised prop-patch op. The audit asked whether
*every* patch surface that can write or stamp `locked` is covered.

`noLock` already covered:
- `upd.after` — rejected since v1.7.28.
- `style`/`resize`/`align`/`beautify` `.after` *and* `.before` — since ADR-1087.

**Two uncovered surfaces were found:**

1. `upd.before` — only `validPatch` ran, no `noLock`. A forged
   `before:{locked:true}` passes intake, sits in `state.history`, and lands on
   the victim's next undo: `_apply(op,false)` restores `op.before` via `_oa`
   (`_stripStruct` does not strip `locked`), locking the shape *locally* — while
   the `_undoWire` inverse `{op:'upd',after:op.before}` is rejected by every
   peer's `noLock(after)`. The undoer locks + reverts; peers keep the forward
   state → **divergence**.

2. `move.before`/`move.after` — `patches()` validated shape but carried no
   `noLock`. A forged `after:[{id,x,y,locked}]` survives `_lwwDrop`'s `filt`
   (`_chg` sees a changed `locked`) and reaches `_stampWrites`'s per-key loop,
   which stamps `wclock[id].locked = op.clock` — a phantom lock-arbitration
   clock. Every later legit `align dir:'lock'` loses arbitration against the
   forged stamp on this peer → **divergence** (the shape itself is untouched —
   `move` only extracts `x`/`y`, making the corruption invisible).

   `before.locked` on `move` is likewise carried into the `_undoWire` inverse's
   `after` (swap: `o.after=op.before`), so a forged baseline also stamps phantom
   clocks on *every peer* once any receiver undoes it.

Other surfaces verified clean: `zorder.changes` carries string fracs (no keys);
`group`/`ungroup.before` reads `groupId` only; `del.connClears` is whitelist-
bounded to `_CC_KEYS`; `add`/`addMany`/`replace` use `validShape` where
`locked:true` is a legitimate shape prop.

## Decision
- Hoist `noLock` to `validRemotePayload` top-level (single shared declaration;
  `align` keeps its `dir==='lock'` conditional shadow).
- `upd`: `before` must pass `validPatch` **and** `noLock`.
- `move`: `after` and `before` must each `.every(noLock)` — the same pattern
  `resize`/`style`/`beautify` already used.

Legit emitters are unaffected: `locked` is never emitted inside `upd`/`move`
patches (lock changes route through `align` `dir:'lock'` ops only).

## Pins
7 behavioural asserts in test.mjs: forged `upd.before.locked` and both forged
`move` directions rejected at `validRemotePayload`; legit ops still accepted; a
forged `move` through the real `Net._onRecv` intake leaves the shape unmoved and
stamps no `locked` clock.

## Byte note
Raw 557,048B after a ~28B comment-tail reclaim at the undo-wire site.
