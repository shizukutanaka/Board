# ADR-0721: del/clear undo-wire carries the wclock snapshot

## Status
Accepted (実装済)

## Context
Deleting a shape snapshots its write-clock map into `op.wc` (del records it in
`_apply`; clear records it at commit) and purges `state.wclock[id]`. Local undo
restores `op.wc` so the revived shape's properties keep their pre-delete
arbitration state.

`_undoWire` translates undo(del/clear) into `{op:'addMany',shapes}` — the wire
carried no `wc`, and `_slimOp` stripped `wc` from every shape-bearing op as
"undo-domain".

## Divergence
After an undo:

- Local: `wclock[S]` restored to the pre-delete clocks.
- Peers: `addMany` re-added S but `wclock[S]` stayed purged.

A remote write with a clock *between* the pre-delete clock and now then:
loses `_lwwDrop` locally (pre-delete clock wins) and applies on peers — the
same op produces different property values on different boards. Same class for
`clear`, whose `wc` is the whole-board map.

## Decision
- `_undoWire` 'del'/'clear' emits `{op:'addMany',shapes,wc:op.wc}`.
- `_slimOp` keeps `wc` on `addMany` only (forward addMany never has one; only
  the undo-wire sets it). `del`/`clear`/`pageAdd` forwards still strip `wc` —
  receivers re-derive.
- Remote `addMany` applies `op.wc` exactly like del's local backward
  (`_wc()[id]=clone(w)`).

## Consequences
- Undo of a delete is now arbitration-convergent end-to-end: shapes *and* their
  LWW state return on every peer.
- Pin + two-peer test: style→del→undo restores `wclock[S].stroke` on both
  sides.
