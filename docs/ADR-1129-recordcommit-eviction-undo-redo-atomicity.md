# ADR-1129 — `_recordCommitted` dedup eviction + undo/redo pointer atomicity

Status: accepted — implemented in v1.8.153 (round879).

## Context

ADR-1128 (round878) closed the dedup-key stranding on `Store.commit` and the
headless emit `_txC`: both install `_sO().add(k)` before applying and, unlike
`applyRemote`'s ADR-1026 `catch→delete` boundary, never evicted on throw.

Two sibling surfaces kept the same defect class:

1. **`Store._recordCommitted(op)`** — the third `_sO().add(k)` site
   (index.html:1627). The caller has *already* applied the local mutation;
   the function records the op: `replace` tomb bookkeeping → `_stampWrites` →
   history push → `_rdb` → `Net.broadcast`. No `try/catch` anywhere.

2. **`undo()` / `redo()` `histIdx` ordering** — asymmetric under `_apply`
   failure:
   - `undo`: `apply(op,false)` → `_pgFollow(op)` → `histIdx--`. A throw inside
     `_pgFollow` left the op *applied* (reverted) but the pointer still
     pointing at it — the next undo reverted it a **second time**.
   - `redo`: `histIdx++` → `_fck` → `apply(op,true)`. A throw inside `apply`
     advanced the pointer past an op that never applied — permanently skipped.

## The Socratic question

> "If a commit-family function installs a dedup key and then throws, what must
> happen for a redelivery to still work — and must the undo pointer move with
> the *view follow* or with the *mutation*?"

## Findings

- `_recordCommitted` can throw: the `replace` tomb block iterates
  `op.after`/`op.before`/`op.pages`/`op.beforePages` and calls `_wD`/`_wTb`/
  `_bT`; `_stampWrites` reads `state.wclock`. A malformed committed op or a
  crashed helper strands the dedup key → identical redelivery is dedup-eaten
  forever → the sender's converged value is dropped and the op never reaches
  history (a real divergence window, same class as ADR-1128).
- Post-record throws (history push done, `_rdb`/`broadcast` throws) are a
  different case: the op *was* committed — evicting the key there would allow
  a double history entry on re-record, which is worse than the stranded key.
  The boundary therefore sits **before** the history push only.
- `undo`'s `_pgFollow` is a view-navigation side effect (ADR-0652) — it has no
  business deciding whether the undo "consumed" the op. Moving the pointer
  must coincide with the *mutation*, not the follow.
- `redo` incremented the pointer before applying so it could *select* the op
  (`_hi()[_hx()]`) — the increment is recoverable by peeking
  `_hi()[_hx()+1]` instead and advancing after apply.
- Pin-finding side effect: `pages:[null]` makes `_pgBar`'s
  `_pgs().map(p=>p.id)` crash inside `_apply`'s unconditional tail — proof
  that real throws inside `_apply` are reachable, which is exactly the window
  the ordering protects.

## Decision

```js
// _recordCommitted — evict on pre-record throw only
try{
  if(op.op==='replace'){ /* tomb bookkeeping */ }
  this._stampWrites(op);
}catch(e){_sO().delete(k);throw e}
_hi().length=_hx()+1; _hi().push(op); ...

// undo — consume with the mutation, follow after
this._apply(op,false);
state.histIdx--;
_pgFollow(op);

// redo — peek, apply, then advance
const op=_hi()[_hx()+1];
_fck(op);
this._apply(op,true);
state.histIdx++;
_pgFollow(op);
```

A throw inside `_pgFollow` now lands *after* the pointer moved — the undo is
consumed, the follow is skipped, and the next undo targets the next op (no
double-revert). A throw inside `redo`'s apply leaves the pointer unmoved —
the op is retried on the next redo.

## Verification

`node test.mjs` → 4232 pass / 0 fail. 9 behavioural pins
(test.mjs:20189-20230): pre-record throw evicts the dedup key and a retry
records exactly once; committed ops stay dedup-guarded; throwing `_apply` on
undo/redo leaves `histIdx` unmoved; a retried redo applies; source-order pins
fix `histIdx--` before `_pgFollow` in undo and `histIdx++` after `apply` in
redo.
