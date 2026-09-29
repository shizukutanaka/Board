# ADR-0724: pageAdd undo — membership purge via _pgDel2 + 'unpage' wire flag

## Status
Accepted (実装済)

## Context
The `pageAdd` backward iterated `op.shapes` only — the members carried by the
commit. A shape that acquired `pg=op.id` *after* the commit (a peer's `add`
broadcast applying to that page) survived locally with a dead `pg`, while
peers' wire `pageDel` ran `_pgDel2` which kills by **current membership** —
membership split.

Second hole: undoing the *last* pageAdd. The old code kept members and let
`_pgHealS` un-page them; peers' `pageDel` killed them — same undo, different
survival on every side.

## Decision
Two branches, each verified symmetric to its wire:

- **Surviving pages remain**: local backward runs `_pgDel2(op, firstId)` —
  identical to the peer-side `pageDel` (kill all current members, purge their
  wclocks, unbind connectors, rehome locked survivors).
- **Set emptied** (`state.pages`→∅): the undo is a *creation revert*, not a
  delete — op-carried members (the pageAdd's own `shapes`) die, every other
  member reverts to un-paged. `_pgDel2(op, null, die)` kills only the
  `die` set (new `only` parameter), then remaining members' `pg` clears.
  The undo-wire emits `{op:'pageDel', unpage:1, shapes:op.shapes}` —
  `_slimOp` carries `unpage`+`shapes` so receivers capture the kill set
  *before* their own record overwrite (the forward `pageDel` path writes
  `op.shapes` for undo bookkeeping — reading it after would kill everyone).
  A receiver holding extra pages rehomes the survivors to `firstId` instead.

`unpage` on a real `pageDel` is never set (senders only emit it from the
undo-wire), and it is ignored when the receiver still has other pages — the
kill semantics of `_pgDel2` are unchanged.

## Consequences
- Undo of a pageAdd is now membership-convergent in both branches;
  op-carried members die, adopted/late members un-page — identical sets.
- Two-peer pin: pageAdd(carrying iS2)→undo → iS2 dead on both, adopted mX
  survives un-paged on both.
