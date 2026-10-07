# ADR-1136: convergence-queue flush coverage × revert/ro lifecycle audit

Status: Accepted (round886)
Date: 2026-10-01

## Context

ADR-1123–1135 built the convergence-emit machinery (`_txE` → `_txFlush` →
`_txC`): when an incoming write loses to a locally-newer clock, the surviving
value is re-emitted so the sender converges too. That machinery only works if
(a) every arming site is followed by a flush in the same call chain, (b) every
commit-family entry flushes a pending nudge first, and (c) the read-only
(`state.ro`) lifecycle is closed — adopted on every doc intake, reverted
consistently, and unlockable. This round audited those three funnels plus the
`_slimOp` field matrix end-to-end.

## Audit findings — all clean

1. **`_txE` arming is closed**: `_pu(_txE||(_txE=[])` appears at exactly six
   sites — `_lwwDrop` prop drop (1564), structural `groupId` (1575) and `frac`
   (1584), the `_mT3` text merges in `upd` (1745) and `beautify` (1900)
   backward apply, and the snapshot-merge emit (8478). Every site is reached
   only through `applyRemote`/`_apply`/`mergeSnapshotOp`, and every such call
   chain ends in `_txFlush()` — `commit` (1493), `applyRemote` bail (1533) and
   tail (1550), `undo` (1656), `redo` (1672), and inline at the merge emit
   (8478). `_recordCommitted` and `_txC` never arm `_txE`, so no tail flush is
   required there (verified: no `_apply`/`_lwwDrop`/`_mT3` reachable from
   either).

2. **`_nugEnd` funnel coverage**: the pending-nudge flush precedes every
   commit-family entry — `commit` (1471), `_recordCommitted` (1622), `undo`
   (1643), `redo` (1663), `switchPage` (2197), the hide flush (9064),
   `visibilitychange` (9068) and `pagehide` (9071) handlers, and the internal
   nudge-merge path (10109). No commit path can strand a pending nudge.

3. **`_roRe` revert domain is complete**: the shared revert seam (called at
   `commit`, `_recordCommitted`, `_nugPush` — the only three mutation funnels)
   restores via `op.orig` (keyed patch), `op.before[]` (per-shape baseline),
   and `op.changes[].before` (frac). Every op shape that can carry pre-commit
   live writes carries exactly one of these domains — move (`orig`), patch
   ops (`before`), zorder (`changes`). Add-family ops carry none because the
   ro gate runs *before* `_apply` — no pre-write exists to revert.

4. **`state.ro` lifecycle is closed**: initialised false (1200), adopted via
   `d.ro===1` on snapshot adopt (7716), `.board` import decode (8813), IDB
   `Persist.load` (8953), and backup restore (9021); persisted to IDB on save
   (8915/8968); unlocked via the ro badge click (9655). Every doc-switch path
   re-adopts, so room-switch residue is transient only.

5. **`_slimOp` field matrix verified for every undo-wire emission**: `addMany`
   strips only `origSel` — the member wclock snapshot `wc` rides the wire
   (ADR-0721/0722); `del`/`clear`/`pageAdd` strip `wc` (receivers tomb with
   the op's own clock, they don't need the sender's); `pageDel` keeps
   `id`/`firstId`/`unpage`/`shapes` (receivers re-collect members and
   re-derive `connClears` — `i`/`name`/`wc` are undo-domain only);
   `replace` keeps `pages`/`curPg`/`afterWc`; `pageName` keeps `nts`/`ntp`
   (the restored name clock) while `bts`/`btp` are write-only undo slots
   recorded at apply time; `move` gets absolute `before`/`after` re-derived
   from live shapes; patch ops get `locked` stripped from both `before` and
   `after`. Every `_undoWire` emission lands inside this matrix.

## Decision

No code change — the audit resolved clean. The verified contract is pinned in
test.mjs: the six-site `_txE` arm boundary, the four apply-calling
`_txFlush()` tails, the all-dropped bail flush, the `_nugEnd` funnel entries,
the three-site `_roRe` seam, the `wc` asymmetry in `_slimOp`, and the
adopt/persist/unlock coverage of `state.ro`.

## Consequences

The convergence-emit pipeline is now closed on all four sides: arm → flush
ordering, funnel coverage, revert domain, and wire field reach. Any future
site that arms `_txE` or adds a commit-family entry without flushing will
trip the count/site pins.
