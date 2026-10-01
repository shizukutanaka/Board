# ADR-0929: undo-wire × backward-apply convergence audit — clean

## Status

Accepted (2026-10-01)

## Context

Every local undo performs two things: a **backward apply** of the recorded
op locally, and a **broadcast** of `_undoWire(op)` — wire ops receivers apply
*forward* under the undo's fresh clock `U`. Convergence requires the undoer's
backward effect and every receiver's forward effect to produce the same
post-state, including side-channel clocks (`wclock`, `_born`, `_del`,
name/`nts` clocks, `_lastRep`).

## Audit (all 14 op kinds + redo)

| op | backward (undoer) | undo-wire (receivers, forward) | stamps |
|---|---|---|---|
| `add` | splice + tomb | `del` | `_del=U` both |
| `addMany` | splice + tomb | `del` | `_del=U` both |
| `del`/`clear` | restore + `_bT(U)` → `_wR(wc)` | `addMany`+`wc` (+connClears `upd`) | `_bT` then `_wR` — **same order both sides** → born reverts to recorded `B0` identically |
| `move` | absolute `op.before` per-axis `_lwwSkip` | `move{after:op.before}` | `w.x/w.y=U` via `_stampWrites(w)` |
| `upd`/`style`/`resize`/`align`/`beautify` | `op.before` filtered by `_lwwSkip` | same op `{after:op.before}` | `_lwwSkip` (undoer) ⇔ `_lwwDrop` (receivers' intake) — one rule, two sides; `w[k]=U` both |
| `group`/`ungroup` | `op.before` groupId, locked+`_lwwSkip` | dedicated `group`/`ungroup` ops | `w.groupId=U` both |
| `zorder` | `changes` before-frac, `_lwwSkip` | `zorder{changes}` | `w.frac=U` both |
| `replace` | wclock=`op.wc`, `_bT(U)` (ADR-0928) | `replace{after:op.before,afterWc:op.wc}` | `_bT(U)` both — ADR-0928 closed the last gap |
| `pageAdd` | `_pgDel2` membership kill | `pageDel{unpage,firstId}` | `_del=U` via `_pgDel2` both |
| `pageDel` | reinsert + restore + `_bT`→`_wR` | `pageAdd`+`addMany{wc}` | born=`B0` both (same `_bT`→`_wR` order as del) |
| `pageName` | restore `bts` name | `pageName{after:before,nts:bts}` | `nts` clock rides the op — ADR-0727 |
| redo | `_fck` restamp `U'` → forward apply | broadcasts `op` itself | `_stampWrites(op)` both |

Verified supporting invariants:

- Remote ops never enter `_hi()` — history holds local commits only, so
  backward paths always run against locally-produced records (move always
  has absolute `before`/`after`; the delta-wire fallback is unreachable).
- `_lwwSkip` (peer `!==` own, newer-than-op-clock) and `_lwwDrop` (intake,
  same condition against `op.after`) are the same rule evaluated on each
  side's own wclock — forward applies stay unconditional because intake
  already filtered stale keys.
- `undo()` stamps `_stampWrites(w)` on the *emitted wire op*, not on `op` —
  which is exactly what receivers stamp for themselves.
- The `_bT`-then-`_wR` order inside del/pageDel backward **and** addMany
  forward intentionally reverts `born` to the recorded `B0` — the undo
  restores the prior existence *as it was*, symmetric on every peer.
  `'replace'` backward stamps `U` instead (ADR-0928) because receivers
  compute it via forward apply — a deliberate, still-convergent semantic
  split: del-undo resurrects the old existence, replace-undo is a fresh
  introduction.
- Locked gates mirror on both directions everywhere (ADR-0712/0716/0923):
  a write that forward-skipped a locked shape is never restored by undo.

## Conclusion

No defect found — every backward/forward pair is state-symmetric, and every
clock domain (prop writes, `groupId`, `frac`, `_born`, `_del`, `nts`,
`_lastRep`) stamps or merges identically on the undoer and receivers.
Together with ADR-0924 (backward-apply gates) this completes the undo-wire
convergence audit.
