# ADR-1112 — replace undo keeps the peers' tomb parity (interim existence clocks)

## Status

Implemented (v1.8.136, round862).

## Problem

`case 'replace'` backward (undo of a whole-document swap — `.board`
import, share-link import, backup restore) restored `op.wc` into the
freshly-wiped `state.wclock` and stopped there. The *forward* apply —
what every peer runs on the same swap's undo-wire message — also
performs two more existence-clock writes on the pre-wipe map `wc0`:

1. `_wD(id, op.clock)` for every swapped-out id not carried forward
   (the `old0` shape loop and the `pg0` page loop, each with the
   `_born` escape), and
2. `_wTb(wc0, op.clock, inN)`, which preserves any `_del`/`_born`
   existence clocks learned between the original commit and the swap —
   restamping an older interim tomb up to the swap clock so it survives.

Backward ran neither. Consequences, all divergence-class:

- A remote tomb for a doc-B shape that arrived in the import→undo
  window was *wiped* on the undoer while every peer kept it (via
  `_wTb`). A stale `add` redelivered later (seenOps eviction, delta
  sync) then resurrected the shape on the undoer only.
- The swapped-out set itself got no tomb on the undoer (`old0`/`pg0`
  loops were forward-only), while peers tombed it at the undo clock —
  a resurrectable id on exactly one side of the wire.
- Restoring `op.wc` alone also rewound prop-clock entries to
  pre-commit values — that part is intentional (both sides restore the
  same recorded map) and is *not* what this changes; only existence
  clocks, which are learned information that must not be unlearned.

## Decision

The backward branch now runs the same tomb parity the forward does:

- `if(forward) for(const s of keep) _wR(s.id, wc0[s.id])` stays
  forward-only (`keep` is empty backward by construction — no born can
  outrank the fresh undo clock).
- The `old0` tomb loop, `_wTb(wc0, op.clock, inN)`, and the `pg0` tomb
  loop are hoisted out of `if(forward)` and run in both directions —
  `inN` is `next`'s id set in both (backward `next` = `op.before`, the
  same set the peers' forward `after` resolves to), and the page tomb
  loop now arbitrates against `op.pages` forward / `op.beforePages`
  backward.
- `op.wc`/`op.afterWc` merges keep their positions (before the tomb
  writes), mirroring the forward order exactly — the undoer ends with
  the same map the peers compute.

Interim tombs are therefore *restamped to the undo clock* on the
undoer, exactly as `_wTb` does on every peer — never preserved
verbatim (a verbatim tomb older than the undo clock would let a
mid-window `add` diverge the sides).

`state.ro`, `docName`, and the viewport were audited and need no
op-carried restore: undo is `ro`-gated (an ro doc cannot be undone at
all), `docName` converges on the separate name channel (restoring it
locally would *create* divergence), and the viewport is per-client
state by design.

## Consequences

- Undo of a document swap now leaves the undoer's existence map
  identical to the peers': interim tombs restamped to the undo clock,
  `_born` preserved on tombed records, lone `_born` records dropped
  symmetrically, swapped-out shapes and pages tombed.
- The stale-`add` resurrection window is closed: `add`/`addMany`'s
  `_tmb` gate sees the tomb on both sides.
- Behavioural pins (5 asserts): interim tomb survives the wipe
  (restamped), tombed record keeps `_born`, doc-A member restored,
  restored in-set member carries no stale tomb, stale `add` still
  drops post-undo.
- Comment-tail reclaim (~270B) on the pageDel ADR-0703/0724 blocks
  funded the change; raw 556,977B.
