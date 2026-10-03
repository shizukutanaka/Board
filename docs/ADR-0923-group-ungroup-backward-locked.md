# ADR-0923: group/ungroup backward skips locked members

## Status

Accepted (2026-10-01)

## Context

The `group`/`ungroup` forward applies and the wire-side path peers run for
our undo (forward `ungroup`/`group` on the undo-wire op) both gate per-shape
on `!sh.locked` (ADR-0716).

The local backward (undo) path did not: `if(op.before)` loops restored
`b.groupId` — or deleted it — on any member, locked or not.

Concrete divergence: after a `group {A,B}` commit a peer locks A. Local undo
of the group un-groups A locally while every peer's forward `ungroup`
(undo-wire) skips the locked A — A's membership splits: halo/selection/
group-ops diverge permanently with no heal op.

Undoing an `ungroup` was the mirror image: a member locked since the ungroup
got its `groupId` restored locally while peers' forward `group` skipped it.

The same locked-parity family as ADR-0712 (prop patches) and ADR-0716
(move/group/ungroup forward).

## Decision

Both backward loops now gate identically to the forward apply:

```js
for(const b of op.before){
  const sh=byId(b.id);if(!sh||sh.locked)continue;
  if(_lwwSkip(b.id,'groupId',op))continue;
  if(b.groupId)sh.groupId=b.groupId;else delete sh.groupId;}
```

The unreachable `else{const gid=op.gids?.[0];...}` fallback was removed:
locally committed `group`/`ungroup` ops always record `before` (doGroup
6298, doUngroup 6313) and the undo-wire ops carry it too — backward apply
never sees a `before`-less ungroup op, so the fallback only existed to
crash-path the `op.gids` dereference pinned by v1.7.34. Graceful no-op is
now the structural property (`if(op.before)` guards the whole restore).

## Consequences

- Group membership converges under undo + concurrent locks — the locked
  member keeps its groupId on the undoer exactly as on every peer.
- Behavioural pin: locked member keeps `groupId` across `group` backward,
  unlocked sibling un-groups (2 asserts).
- `pass += 1888` (prev 1886 + 2).

## References

- ADR-0712 — locked gate on prop-patch backward (same family).
- ADR-0716 — locked gate on move/group/ungroup forward.
- ADR-0916 — groupId is a structural key (patch-stripped elsewhere).
