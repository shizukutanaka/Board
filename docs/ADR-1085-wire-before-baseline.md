# ADR-1085 — wire `before` is the changed-props baseline, not undo data

Status: accepted (audit conclusion; contract pinned). Supersedes the ADR-1048 P4-b
hypothesis "strip `before` patch arrays from wire ops to compact the payload".

## Hypothesis (rejected)

Patch-family wire ops carry `before` arrays that look like pure undo-domain data:
the receiver only ever forward-applies `op.after`, and undo rides the wire as
separate ops (ADR-0443+). Stripping `before` in `_slimOp` would shave ~25–30B per
patched shape per op. Implemented → the two-peer commute test failed:
`commute: A and B agree on y after concurrent moves` diverged.

## What `before` actually is on the wire

The receiver diffs `before`→`after` to learn **which properties the writer
touched** — the per-prop LWW change-detection baseline consumed by the
arbitration layer (`filt`/`stamp`/`_chg` in `Store._remoteFilter` /
`_stampWrites`, ~1562-1609) and the del connClears comparison (~1710, 1847-1857).

- **move** (ADR-0729/0741): `after` always carries BOTH axes absolute
  (`{id,x,y}`). Without `before` the peer cannot tell B moved only y, so it
  would apply x too — concurrent moves (A:+10x, B:+5y) must converge to
  x=10 ∧ y=5 on both sides, which requires knowing which axes each op touched.
- **style/resize/align/beautify**: same baseline role — the validator REQUIRES
  `before` (`patches(op.before)`), so emitting without it makes every peer
  reject the op outright.
- **upd**: `before` is a single patch object; the receiver diffs keys the same
  way (validator already tolerates `before==null`, but a without-`before` op
  gets its whole `after` treated as touched — different semantics).
- **zorder `changes[].before`**: `_chg({frac:before},{frac:after},'frac')` is the
  real-move test — needed to filter no-op entries.
- **del `connClears[].before`**: the unbind-compare — a connector is only
  unbound if its live binding still equals the recorded `before`.
- **group `before`**: member-id list, required by the validator.

## Decision

Keep `before` on the wire for all patch-family ops. It is semantic input to
convergence, not dead weight. The only savings reachable would be a separate
`changedProps` list — same bytes, worse. Rejected, and the contract is pinned:

- emitted move/style/upd/zorder/align/resize/beautify ops DO carry `before`
  (and `zorder.changes[]` carry `before`);
- before-less style/align ops are still rejected by intake;
- `move` keeps its `before==null`-allowed contract (delta-capable legacy form).
