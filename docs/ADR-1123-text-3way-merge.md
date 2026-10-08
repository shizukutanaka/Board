# ADR-1123 — remote-wins text props merge 3-way; union emits a convergence op

**Status**: implemented (v1.8.147)

## Context

`upd`/`move`-family ops arbitrate `text`/`label` per property clock. Pre-1123 the
winner landed **whole-string**: a remote win overwrote the local edit even when
the two edits touched disjoint regions — silent local-edit loss (W19 of
ADR-1048).

## Decision

3-way merge `_mT3(local, base, remote)` on the remote-wins apply paths (`upd`'s
`op.before`/`op.after` baseline and the patch-list site's per-entry baseline):

- Compute each side's changed hunk against `base` (common prefix/suffix —
  `_cpl`/`_csl`).
- **Disjoint hunks** → the remote prop-clock still wins (determinism), but the
  union `remote_hunks + local_hunk` is applied locally so both edits survive.
- **Overlapping hunks** → remote wholesale win, LWW parity preserved.

When the union differs from the remote's string, the merge queues `{id,k,b,a}`
(`b` = remote's text, `a` = union) into `_txE`; `_txFlush()` drains it on every
commit path (commit / applyRemote / undo / redo) as an `upd` whose `before` is
the remote's text — so a third peer's own disjoint diff against the same remote
text lands cleanly on the union too. `state.ro` swallows the emit (read-only
boards merge locally, never write back). Clocks order the emit → deterministic
end state on every peer.

## Size

Comment-tail compression sweeps ~250 lines of trailing `// ADR-XXXX` markers
(the canonical reference lives in the ADR file itself) to keep raw size under
the ceiling alongside the merger.

## Tests (9 pins, test.mjs)

- Disjoint local+remote edits union (`'Hi world'` × `'Hello universe'` →
  `'Hi universe'`).
- Union emit captured at `Net.broadcast` — `after.text` is the union,
  `before.text` is the remote's string.
- Emit stamps the local writer clock.
- Overlapping hunks lose wholesale; no emit when nothing survives.
- `_txFlush();` on all 4 commit paths; merge hooks on both apply sites.
