# ADR-1104 — ro-rejected commits revert the caller's live pre-commit writes

- Status: accepted (implemented)
- Date: 2026-10-01
- Version: 1.8.128

## Context

The ro (`state.ro`) funnel rejects every commit at `Store.commit` and
`Store._recordCommitted` (ADR-1057/1076), and `_nugPush` buffers deferred
ops (move/zorder/group/style) for the 400 ms flush into the same gates
(ADR-0957/0960). The **apply-then-commit** callers — `nudgeSelection`,
`doGroup`/`doUngroup`, `applyStyleToSelection`, `doFlip`, `doMatchSize`,
`doAlign`, `doBringFront`/`doSendBack`, drag finalizes — write to the live
shapes *first* (drag previews, optimistic UI), then hand a baseline-bearing
op to the commit seam.

## Defect

When `state.ro` is true the gate rejects the op — and nothing rolls back the
live writes the caller already applied:

1. Editable board, user nudges a shape → `_sT2(sh,dx,dy)` runs, op buffers.
2. A doc-switch adopts `ro` mid-gesture (import, share link, backup —
   ADR-1069), or the board was ro all along and a code path missed a gate.
3. `_nugEnd`/`Store.commit`/`_recordCommitted` hits `state.ro` → toast +
   reject.
4. The shape stays moved **locally**; nothing reverts it. ADR-1020's
   user-driven save then persists the divergence — reopening the same ro
   document shows the phantom edit.

Every apply-then-commit family was exposed: `orig` clones (move),
`before` entries — full clones (flip/matchSize/align) and sparse props
(style/lock/group/ungroup) — and `changes[].before` (zorder `frac`).

## Fix

One shared seam restores the op's own baseline at all three funnel points:

```js
function _roRe(op){
  for(const k in op.orig||{}){const s=byId(k);if(s)_oa(s,op.orig[k])}
  for(const b of[].concat(op.before||[])){const s=byId(b.id||op.id);if(s)_oa(s,b)}
  for(const c of op.changes||[]){const s=byId(c.id);if(s)s.frac=c.before}
  _sz();_iv()
}
```

- `Store.commit` / `Store._recordCommitted` ro gates: `_roRe(op);_roNo();return`.
- `_nugPush`: same gate at push time, so a deferred op under ro never buffers
  (the revert happens immediately, while the caller's baseline is still the
  live write it just made).
- `_oa` is the restore vehicle — it re-parks image refs and touches the grid
  index, so restorations behave like ordinary remote writes.
- Baseline-less ops (`add`/`addMany`/`del`/`clear`/`replace`) never live-write;
  `_roRe` is a correct no-op for them.
- Slider previews (colour/size/opacity inputs) write live with no commit data
  on a timer — they gain `if(state.ro)return` guards instead of `_roRe`, so an
  ro board doesn't spam `readOnlyMode` toasts per input event.

## Pins (test.mjs)

12 behavioural asserts drive the seam through the exported callers under
`state.ro=true`: arrow-key nudge, `doBringFront`, `doFlip`, `doMatchSize`,
`applyStyleToSelection`, `doLock`, `doGroup`, and an object-form `upd`
`_recordCommitted` — every live write reverts, no history records, the
`readOnlyMode` toast fires, and the editable control applies normally.
Two source pins lock the gate text.

## Consequences / leftovers

- `undo()`/`redo()` keep the original non-reverting gate: they never
  live-write (the undo paths apply via `_apply`), so `_roRe` would be a no-op.
- Cosmetic residue: `doGroup` still fires its success toast after the gate
  rejects (the caller can't observe rejection — same class ADR-1073 fixed for
  paste). Left for a future round; the model state is already correct.
