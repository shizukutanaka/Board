# ADR-1066: _attachShape closes the coexistence rule at install; merges keep the raw pair

## Status

Accepted — round815, v1.8.089.

## Context

ADR-1065 fixed the `img:`-ref × `dataUrl` coexistence invariant — *the written
prop wins* — at the four writers that could reintroduce the pair onto a live
shape (`_oa`, `_mergeSnapshotOp`, `_imgAttach`, `replaceImage`). The renderer
only ever draws `dataUrl` (`getImg(_du(s))`), so a surviving `img` ref is
invisible until a blob coincidentally arrives under that key, at which point
the arrival straggler scan silently rewrites `dataUrl` — a quiet divergence
between peers.

`_attachShape` — the funnel through which every *installed* shape passes
(remote `add`/`addMany`/`replace` ops via `_attachOp`, snapshot-embedded new
shapes, `.board`/share-link/clipboard imports, and every undo restore in
`_apply`'s backward paths) — was the fifth writer left out. A shape carrying
both props reached it unchanged: the stale ref was neither parked (no imgq
heal) nor stripped, leaving a live shape with a dead ref that a coincidental
blob arrival could still clobber.

## Decision

`_attachShape(s, raw)` now enforces *bytes beat refs* on install:

```js
if(s&&_iS(s.img)){
  if(_du(s)){if(!raw){const{img:_x,...rest}=s;return rest}}   // strip the ref
  else{ /* _imgIn materialize → dataUrl, else _park for imgq heal */ }
}
```

- **Install sites keep `raw` unset** — `add`/`addMany`/`replace` ops, imports,
  undo restores. A coexist payload cannot place a stale ref on the board.
  Bytes are the visual truth (the renderer never reads `img`), so stripping is
  convergence-neutral for every peer that renders the same bytes.
- **`_mergeSnapshotOp` passes `raw=1`** — its per-property LWW arbitrates
  `img` vs `dataUrl` by `op.wc` clocks; pre-stripping would have deleted the
  `img` candidate before the merge could see it (an adopted ref intent newer
  than the bytes must still be able to win → park → heal). The merge epilogue
  already handles both directions (`duNew`→drop ref, `imgNew`→park).

Ref-only paths are unchanged: `_imgIn` hit materializes bytes now, a miss
parks for imgq heal.

## Consequences

- The coexistence invariant now holds at every shape writer: live shapes on
  the board can no longer carry `img`+`dataUrl` from *any* path (ops, snapshots,
  imports, undo), not only the four patched in ADR-1065.
- An old-version peer broadcasting a coexist add/replace arrives stripped —
  no dead ref, no clobber surface.
- `@`-marked foreign refs can't reach `_attachShape` (persist-only marks,
  stripped by `_imgAttach` at load), so no `'@'` handling is needed here.

## Tests

test.mjs `ADR-1066` block: install strip via `Net._attachShape`, remote `add`
and `del`-undo paths, ref-only materialize/park unchanged, source pins for the
`raw` gate and the `op=this._attachOp(op,1)` merge call.
