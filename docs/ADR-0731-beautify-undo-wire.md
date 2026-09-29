# ADR-0731 — 'beautify' undo rides the wire too (patch swap)

## Status
Accepted (v1.7.757)

## Context
ADR-0730 made 'beautify' a wire op so the pen→rect retype converges. But
`_undoWire` had no 'beautify' case (`default: null`): undoing the retype
restored the pen only on the undoer — every peer kept the rect, the exact
divergence ADR-0730 closed, one undo later.

## Decision
'beautify' joins the `upd`/`style`/`resize`/`align` undo-wire family:
`{op:'beautify', before:op.after, after:op.before}` — the before/after patch
swap. The inverse validates (patch arrays, no `locked`), arbitrates through
`_lwwDrop`/`_stampWrites` per-key against the fresh undo clock, and applies
through the shared `_apply` patch loop — no new machinery.

## Consequences
- undo: peers restore the pen patch (`{id,type:'pen',pts}`).
- redo re-broadcasts the forward op with a fresh clock → peers re-apply the
  retype. Convergent on both directions.
- Leftover geometry props (a pen re-acquiring `x,y,w,h`, a rect keeping
  `pts`) match the local apply semantics byte-for-byte — no new surface.
