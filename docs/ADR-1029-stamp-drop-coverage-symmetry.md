# ADR-1029 — Stamp×drop coverage symmetry audit (per-property LWW)

**Status:** Accepted — audit complete, no defect found; contract pinned.

## Context

Per-property LWW convergence rests on two functions that must cover the
**same key space** or divergence is silent:

- `Net._lwwDrop(op)` — drops (per-key, via `delete after[key]`) remote
  writes whose clock loses to the recorded write clock `wclock[id][key]`.
- `Store._stampWrites(op)` — records `wclock[id][key] = op.clock` for the
  keys an applied write actually changed.

An asymmetry in either direction is a divergence class:

- **drop checks a key stamp never records** → a forged/arriving key would
  be arbitrated against an absent clock — first write always wins, and the
  winner is never recorded, so *every* subsequent write also arbitrates
  against nothing (anarchy window, not a stable LWW).
- **stamp records a key drop never checks** → a local write gets its clock
  recorded but the *peer's* drop filter doesn't consult it — peer's older
  writes keep clobbering the newer local state (silent reverts).

## Audit table

| Surface | Verdict | Evidence |
|---|---|---|
| Gate function | shared | `if(!this._lwwOp(op))return` guards *both* `_lwwDrop` and `_stampWrites`; `_lwwOp` enumerates upd/style/resize/align/group/ungroup/zorder/move/beautify |
| Change detection | shared | `this._chg(before,after,key)` (JSON-compare per key) inside the drop `filt` and the stamp loop alike — only changed keys arbitrate/stamp |
| `upd` key space | symmetric | drop `filt(id,after,before)` iterates `after` keys; `stamp(op.id,op.after,op.before)` iterates the same keys |
| `group`/`ungroup` | symmetric | drop filters `op.ids` on `w[id]['groupId']`; stamp writes `w['groupId']=C` for changed members |
| `zorder` | symmetric | drop filters `op.changes` on `w[id]['frac']`; stamp writes `w.frac=C` per changed id |
| generic array ops (move-absolute/style/align/beautify) | symmetric | drop filters `op.after` per-shape per-key; `stamp(p.id,p,bb[p.id])` stamps the same `(id,key)` cells |
| delta-move (local) | consistent | apply skips locked shapes *and* stamp gates `!s.locked` + `dx/dy!==0` — a write that didn't happen records no clock |
| dead-id writes | consistent | drop filters `byId(p.id)?filt:false`; stamp gates `if(!after||!byId(id))return` — dead ids live in the tomb/born domain, not per-prop LWW |
| structural keys | consistent | stamp skips `pg`/`frac`/`groupId`/`_x`/non-`_typOK` `type`; intake strips pg/frac (ADR-0912/0913), groupId rides only dedicated ops (ADR-0916), `_`-prefixed keys are undo-domain locals, beautify-`type` requires `_typOK` (ADR-0990) — the drop filt never sees them on the wire |
| local commit | stamped | `_recordCommitted` calls `_stampWrites(op)` after the caller applied the change |
| remote intake | stamped | `applyRemote` calls `_stampWrites(op)` post-`_lwwDrop`/apply |
| undo | stamped | `undo()` stamps each inverse wire op `w` under the restamped undo clock — the restored values carry the undo clock so peers arbitrate the restore as a new write (ADR-0717) |
| redo | stamped | `redo()` stamps `op` under the restamped clock (ADR-0718) |
| snapshot LWW merge | consistent | `Net._mergeSnapshotOp` merges per-prop via the same `clockNewer` reads of `wclock[id][key]` — populated by the same stamps |
| `connClears` endpoint rewrites | convergent | applied via `_oa` on *both* sides inside the del apply, un-stamped on both — any later write to the endpoint key arbitrates identically everywhere |
| undo vocabulary | complete | `_undoWire` covers every committable kind (round738/ADR-0989: 17-kind parity across validRemotePayload/_apply/_undoWire/REMOTE_OPS) — every backward apply has its stamping wire op |

## Contract rule

A new per-property LWW op must:

1. join `_lwwOp` — the single gate both `_lwwDrop` and `_stampWrites` share;
2. stamp exactly the keys it applies (`_chg`-gated, live-shape only);
3. produce its inverse via `_undoWire` so `undo()` stamps the restored
   values under the undo clock;
4. keep structural keys (`pg`, `frac`, `groupId`, `_`-prefixed) out of
   `after` — they belong to dedicated ops or the heal path, not per-prop
   LWW.

## Pins (test.mjs, +9)

- `_lwwOp` single-gate body present (shared by both functions).
- Structural skip list `key==='pg'||key==='frac'||key==='groupId'||key[0]==='_'`.
- `this._stampWrites(w);Net.broadcast(w)` — undo stamps inverse wire ops.
- `this._stampWrites(op);Net.broadcast(op)` — redo stamps the restamped op.
- Behavioural: remote `upd{x:5}` applies and stamps `wclock[id].x`;
  `upd{x:1}` at an older clock is dropped (x stays 5); `upd{x:9}` at a
  newer clock applies and restamps.

## Accepted residuals

- The drop `filt` consults `w[key]` for any key that could appear in a
  remote `after` — a forged structural key would arbitrate against an
  absent clock and pass, but the apply-side strips (ADR-0912/0913/0373)
  neutralise it; stamping stays correct for real keys.
- `dir:'lock'` prop writes ride the same patch ops and stamp/ arbitration
  as other keys; the lock *gate* itself is apply-side, not LWW.
