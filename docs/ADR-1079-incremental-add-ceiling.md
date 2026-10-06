# ADR-1079 — incremental adds share the wholesale ceiling

- Status: implemented (v1.8.103, round829)

## Context

Every wire face that can *wholesale-load* a document bounds the shape count at
`SHARE_MAX_SHAPES` (200,000): snapshot adopt (`valid` filter at ~8483), `sync-req`
delta ops (`msg.ops` slice ~8335), `.board`/share-link import (~8745). But the
*incremental* op path had no aggregate ceiling:

- `add` forward: `if(!byId(wid)) _sh().push(...)` — any count of distinct ids.
- `addMany` forward: same, ≤200K per op but unlimited op count.
- `pageAdd` member adds and the backward-apply restores (`del`/`clear`/`pageDel`
  undo) pushed without a ceiling check either.

A MAC-authenticated peer can mint an unbounded sequence of `add`/`addMany` ops —
each individually valid, ≤200K shapes per op — and grow `state.shapes` without
bound. The board array feeds O(n) work per frame (grid rebuild, bboxAll, draw
culling, serialization on every save), so this is both a memory and a per-frame
CPU amplifier for every connected client, not just the victim's tab.

## Decision

```js
const _shCap=()=>_ln(_sh())<SHARE_MAX_SHAPES;
```

One shared ceiling helper gates every `_sh().push` site reachable from a wire op
payload (`add`/`addMany`/`pageAdd` forward, `del`/`clear`/`pageDel` backward
restores). `replace` forward needs no gate — `op.after` is already ≤200K by
`validOp` (`MAX_OP_SHAPES`).

- **Same ceiling for local commits**: `Store.commit` routes through the same
  `_apply` switch, so a local user pasting past 200K hits the identical wall —
  local and remote producers share one document-size contract.
- **Partial fills allowed**: `addMany` fills up to the ceiling and drops the
  remainder, consistent with every other cap in the system (per-op slices,
  throttle windows) — a full board degrades to no-ops rather than wedging.
- **Restore paths gated too**: backward-apply `del`/`clear`/`pageDel` restores
  can only re-add what an earlier op removed, so they are bounded in practice;
  the gate keeps the invariant *every remote push site respects the ceiling*
  uniform and future-proof against new restore paths.
- **_eraseBatch pushes deliberately ungated**: the mid-erase batch only re-adds
  shapes that existed before the batch started — capping it would corrupt the
  un-batch/undo of a legitimate local erase.

## Behavioural pins (test.mjs)

- At 200,000 shapes an `add` op adds nothing (`state.shapes.length` stays).
- At 199,999 an `addMany` of 3 lands exactly 1 shape — fills to the ceiling.
- Source pin: the shared `_shCap` helper exists.

## Verified alongside (already bounded)

- `wclocks` per-shape clocks incl. `_del` tombstones: flood-capped (ADR-0738).
- `seenOps` dedup keys: `_trimSeen` bound; keys are `peer:seq` wire ids.
- `state.pages`: `_vPages` (ADR-0700) validates count/extents at intake.
- Erase-batch local pushes: re-add-only semantics (above).

## Consequences

Remote shape-flood converts from unbounded growth to a bounded 200K ceiling —
matching what wholesale paths already promised. Divergence is bounded the same
way as every other drop: the victim keeps 200K shapes, the attacker's extras
never land; a later `replace`/snapshot from a *legitimate* peer still swaps the
board wholesale.
