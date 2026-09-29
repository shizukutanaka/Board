# ADR-0725: pageDel wire carries the sender's rehome target

## Status
Accepted (実装済)

## Context
`_pgDel2` rehomes locked survivors to `firstId` — "the first page that isn't
the deleted one" — computed from the **local** page order. Under concurrent
pageAdds the order can diverge across peers (each peer splices received adds
at their recorded index), so peer A rehomed a locked member to its own first
while peer B rehomed it to a different page. `s.pg` is not LWW-arbitrated, so
the split was permanent — the same member belonged to different pages
forever.

## Decision
- The forward `pageDel` resolves `rehome` = the wire-carried `op.firstId`
  when present and known locally, else falls back to the local first; the
  resolved value is recorded on the op (`op.firstId=rehome`) for the
  redo-wire.
- `_slimOp` carries `firstId` on wire pageDels; `_undoWire` 'pageAdd'
  supplies the undoer's post-undo first for the multi-page case.
- `unpage` ops force `rehome=null` (un-paged) regardless of extra pages the
  receiver may hold — matches the undoer, whose page set is empty.
- `_pgDel2` gains a `viewId` parameter: the view landing stays **local**
  (each peer lands on its own first), while member rehome follows the wire.

## Consequences
- Convergent member attribution even under divergent page order;
  the pg value is identical on every peer.
- Two-peer pin: order [p1,p2,p3] vs [p3,p1,p2], pageDel p2 → locked member
  lands on p1 on both (receiver's own first was p3 — would have diverged).
