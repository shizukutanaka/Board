# ADR-1200 — Orphan-group census funnel parity (`_recordCommitted`)

## Status
Accepted (round950, v1.8.224)

## Context

ADR-1199 introduced `_grpSweep`, the deterministic orphan-group census that strips a
`groupId` carried by fewer than 2 live members. It runs at the `_apply` tail for the
nine membership ops (`del|add|addMany|pageDel|pageAdd|clear|replace|group|ungroup`)
and — because `replace` swaps the board *by the caller* before `_recordCommitted` is
invoked — also inside `_recordCommitted` for `op.op==='replace'`.

That last carve-out was the defect. `replace` is **not** the only caller-mutated op
that can leave a sole-carrier gid behind:

- `doUngroup` deletes `groupId` on every **unlocked** member (`!_lk(s)`), then calls
  `Store._recordCommitted({op:'ungroup',...})`. A **locked** member keeps its gid —
  if it is now the sole carrier the ghost groupId survives locally. The same op on a
  remote peer takes the `_apply` path: the locked member is skipped identically, then
  the tail census strips it. Local keeps `gX`; every peer holds `undefined`.
- `doGroup` assigns `gid` live to all selected shapes, then `_nugPush` arms a pending
  op. If members become locked or die mid-run, `_nugLock` restores their run-start
  `before` state and drops them from `op.ids`. A `group` op that flushes with
  `ids:[oneMember]` is applied remotely and immediately stripped by the census —
  while locally the surviving member keeps the gid that `doGroup` wrote live.

In both cases the board diverges *locally vs remotely* until some later membership op
happens to run the census here: the two commit funnels no longer produce identical
states for identical membership ops.

## Decision

`_recordCommitted` runs the same census predicate as the `_apply` tail:

```js
if(/^(?:del|add|addMany|pageDel|pageAdd|clear|replace|group|ungroup)$/.test(op.op))
  _grpSweep(op.clock);
```

replacing the `op.op==='replace'` special case. The regex is a superset on purpose —
`_recordCommitted` callers today only ever reach it with `replace`, `ungroup`, and
`_nugEnd`-flushed ops (`move`/`group`/`ungroup`/`zorder`/`lock`/`align`/`style`), but
keeping the predicate identical to the `_apply` tail means the invariant is *"the
census follows the op type, not the funnel"*: whichever path an op takes, the
post-state is identical.

Placement stays inside the `try` (dedup-key eviction on throw, ADR-1129) and after
`_stampWrites`, matching the `_apply`-tail ordering. The strip self-stamps
`w['groupId']=C` with the recording op's clock, so it arbitrates exactly like a remote
strip — a later genuine `group` with a newer clock can still re-form the gid.

## Consequences

- `doUngroup`'s locked sole survivor is now scrubbed locally the moment the op
  records — same instant every remote peer scrubs it. No inter-op ghost window.
- A pending `group` that `_nugLock` shrinks to one member is stripped at record time
  locally; remotely it is stripped at apply time. Same value, same clock stamp.
- Non-membership ops (`move`/`zorder`/`align`/`style`/`beautify`/`lock`) hit the
  regex's else-branch: zero behavior change, zero extra cost.
- The `replace` branch is unchanged semantically — it is one arm of the same regex.

## Pins (test.mjs)

- local `doUngroup` over a 2-carrier gid with a locked member → locked member's gid
  is `undefined` right after record (remote-parity), and the strip stamps
  `wclock[id].groupId` with the ungroup op's clock.
- `_nugPush`-armed `group` flushed after mid-run locks shrink it to 1 member →
  survivor's gid is `undefined` after `_nugEnd`.
- A still-≥2 group flushed via `_nugEnd` keeps its gid (census does not over-strip).
- source pin: `_recordCommitted` sweeps the same 9-op regex as the `_apply` tail.
