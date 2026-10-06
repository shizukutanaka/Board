# ADR-1088: ungroup `before` contract on the wire

Status: implemented (v1.8.112)

## Context

ADR-1085 established that wire `before` arrays are the receiver-side
per-prop LWW baseline, and ADR-1086/1087 required complete baselines on
move + the key-equivalent patch families (style/resize/align, zorder,
group). One intake surface was left unchecked: **`ungroup`**.

`validRemotePayload` verified only `ids`/`gids` for `ungroup`, while both
consumers iterate `op.before` blindly:

- `_lwwDrop` builds `bmap` via `for (const b of op.before || []) bmap[b.id] = b`
- `_stampWrites` repeats the same loop

So a forged `ungroup` op with `before: {}` (non-iterable) or
`before: [null]` passed intake and threw inside `_lwwDrop` — landing in
the `applyRemote` catch as an *exception drop*: the dedup key was
evicted (ADR-1026), so every redelivery of the same op re-executed the
crash instead of hitting the dedup Set. Rejection should have happened
at the validator, not via a thrown `TypeError`.

Separately, `group`'s `before` entries (ADR-1087) bounded `b.id` but left
`b.groupId` unvalidated, and `ungroup`'s `before` had no coverage rule at
all — a forged op could declare `ids` it had no baseline for.

## Decision

`ungroup` now requires, at intake:

- `before`: array ≤ `MAX_OP_SHAPES` of objects `{id: _idOK, groupId: _idOK}`
- coverage: every `ids` member has a matching `before` entry (symmetric
  with `group` — legit emit sites always cover all ids in one pass)

`group`'s `before` entries now also bound `groupId` when present
(`_idOK`; absent/`null` stays legal — first-time members honestly have no
prior group).

## Notes

- A `before` entry without `groupId` is rejected for `ungroup`: under
  `_chg` semantics, `undefined → undefined` reads as *unchanged*, so
  `_lwwDrop` would filter the id anyway — the op would silently apply to
  only the covered members. Requiring the entry keeps the op total: it
  either ungroups every id it names or is rejected whole.
- `gids` remains informational on the remote path (apply iterates
  `ids`); it is not a membership oracle, so `before[].groupId` is
  bounded as a wire id rather than required ∈ `gids`.
- Emit sites (`doUngroup`, undo-wire inverse) already produce exactly
  this shape: `{id, groupId}` per affected member.

## Tests

10 behavioural pins: coverage/non-array/null-entry/groupId-less/
oversized-groupId rejection; `group` junk-groupId rejection;
groupId-less `group` acceptance; a rejected `ungroup` leaves the shape
grouped.
