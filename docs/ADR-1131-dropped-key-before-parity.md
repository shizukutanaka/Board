# ADR-1131 — a dropped key leaves `before` too

## Status
Implemented (round881, v1.8.155).

## Context
`_lwwDrop` (index.html:1558) is the intake-side per-property LWW filter: when an
incoming op loses the write-clock arbitration for a key, it deletes that key
from `op.after` (and, for group/ungroup/zorder, the corresponding structural
payload). An op whose changed keys are all dropped is rejected entirely; a
partially-dropped op proceeds to `_apply` with only its winning keys.

Socratic question: *the filtered `after` describes what the op will now apply
— but does `before` still describe the same diff?*

## Findings
- **`before` was never filtered.** `filt` deleted `after[key]` but left
  `before[key]` in place; the multi-shape branch (move/style/resize/align/
  beautify) removed dead `after` elements but kept the full `before` array.
  `group`/`ungroup` already filtered their `before` baseline
  (`op.before=op.before.filter(b=>op.ids.includes(b.id))`), so the patch-op
  family was the lone asymmetric holdout.
- **The asymmetry is a latent clobber.** Nothing reads a dropped op's `before`
  today: remote ops never enter `state.history` (pushes live solely in
  `commit`:1484 and `_recordCommitted`:1634 — undo replays local commits
  only), `_apply` forward reads `after`, and `_stampWrites` reads only
  surviving `after` keys. But any future consumer — a recorded-op surface, a
  backward replay, diagnostics — handed a partially-dropped op would apply
  `before` values for keys the op never wrote, reverting a locally-newer LWW
  winner (the exact divergence the drop exists to prevent).
- **Adjacent boundary verified clean.** `state.pages` is only ever assigned
  `null`, `[]`, `clone(keep)`/`np` of `_vPages`-validated objects, or a real
  `[{id,name,…}]` literal — the `[null]` poison (which crashes `_pgBar`'s
  `p.id` map under `_pgOn()`) is unreachable, and `_vPages` rejects `null`
  entries outright. `curPg` re-resolves on every producer (`_pgAdopt`, every
  `_pgDel2` call site, `switchPage`'s `_pgById` gate, the empties → `null`
  sweeps), so the `_pgOk` all-false "data present, board blank" window has no
  entry path either.

## Decision
- In `filt`'s drop branch, delete `before[key]` alongside `after[key]` —
  the op's baseline now covers exactly the keys it still carries.
- In the multi-shape branch, drop each `before` element whose `after`
  element was fully filtered (`op.before.filter(b=>op.after.some(p=>p.id===b.id))`),
  mirroring the group/ungroup convention.
- Pin the boundary contract: remote ops do not grow `state.history`, and
  `_vPages` rejects the null sentinel / accepts real objects.

## Verification
`node test.mjs` → 4250 pass / 0 fail. Pins cover: partial upd drop removes the
key from after **and** before while preserving the surviving baseline; a fully
filtered move element drops its before element; a remote op applies without
entering the undo log; `_vPages` rejects `[null]` and admits a valid page.
