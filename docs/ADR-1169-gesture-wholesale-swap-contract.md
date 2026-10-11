# ADR-1169: gesture × wholesale-swap contract — survive same-page, cancel on page move

## Status

Accepted (implemented since ADR-0984; contract pinned in round919, v1.8.193).

## Context

A remote `'replace'` op performs a wholesale document swap while a local pointer
gesture (move-drag, resize, rotate, marquee, pen, …) may be armed. The audit
question: does the apply leave the gesture in a coherent state, and what happens
to the gesture's stale shape references?

The apply nulls `state.pages`/`state.curPg` before `_pgAdopt`, whose
`nc!==oc` comparison can only fire when the adopted doc carries ≥1 page and the
landing differs. For a single-page adoption (`pages:null`) the gate reads
`null===null` — the gesture survives. Read naively that looked like a hole; the
audit resolves it as the intended half of a two-case contract.

## Decision

1. **Landing-page change → cancel.** `_pgAdopt` cancels the gesture only when the
   adopted landing page differs (`nc!==oc`), mirroring `switchPage` (ADR-0664):
   a page move strands every armed gesture on now-off-page shapes, so it dies.
2. **Same-page / pages-null swap → survive.** A swap that keeps the same page
   context (or the single-page `pages:null` form) does NOT cancel. The apply's
   `_bT` stamps record every swapped-in remote-born id into `ptr.reborn`
   (ADR-0970/0984), and the cancel/restore-merge paths (`_gR1`, `_gR2`, `_gRst`,
   `_gRL`, `_nugLock`) skip `_rb(id)` — the user's drag continues on the live
   keep-survivors while swapped-in shapes keep their incoming geometry.
3. **Dead ids never commit.** Every commit path re-resolves ids against live
   shapes at emit time (`mids = dragStartShapes.keys().filter(id => byId(id)…)`,
   `resizeOrig`/`rotOrig`/way/lbl via `byId(orig.id)`), so a shape dropped by the
   swap is silently excluded — no dead-id op reaches history or the wire.

## Consequences

- The `nc===oc===null` outcome is load-bearing: a same-page swap is not a
  context switch, so killing the user's drag would be strictly worse.
- A reborn same-id entry included in a commit carries a convergent delta — every
  peer applies it to their swapped copy; accepted as convergent edge behaviour.
- `case 'clear'` needs no cancel: REMOTE_OPS excludes it, and its only producer
  (`ctxClear` menu) is physically unreachable while `ptr.down`.

## Audit pins (test.mjs)

- `pages:null` swap: gesture stays armed; swapped-in id marked `ptr.reborn`;
  dropped dragged id unresolvable (`byId` null → commit filter).
- Local `commit({op:'replace'})`: same contract.
- Source pins: `_pgAdopt` `nc!==oc` cancel; `mids` live-filter line.
