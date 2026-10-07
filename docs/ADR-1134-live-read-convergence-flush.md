# ADR-1134: Live-read convergence flush

Status: accepted (v1.8.158)

## Context

ADR-1123/1124/1125/1126 introduced the convergence emit queue `_txE`: when a
remote op's prop loses per-property LWW locally, the local winner is queued and
`_txFlush` emits it back as an `upd`/`zorder`/`group`/`ungroup` op so both sides
converge on the same value. ADR-1130 made the drain best-effort.

Audit of `_txFlush`'s internal consistency found the queue carried the
**queue-time** value (`e.a` / `e.b` captured inside `_lwwDrop` / `_mT3` merges).

Normally push→flush is atomic within the same apply call. But a throw between
`_lwwDrop` and the flush — `_apply`, `_stampWrites`, or `_pgFollow` throwing
inside `applyRemote`/`Store.commit`/`undo`/`redo` — leaves entries stranded in
the module-global `_txE` until the *next* flush. In that window:

- the live prop can move on → the deferred emit carries a **stale `a`** under a
  fresh clock → peers converge onto the abandoned value while the local side
  has the newer write: a permanent divergence until another write to that key;
- the shape can be deleted or the doc swapped → the emit targets a **dead id**
  in another document's keyspace;
- the prop can already have converged (the remote's claim landed) → the emit is
  pure wire noise re-claiming a value nobody needs.

## Decision

`_txFlush` resolves every queued entry against the live shape at flush time:

```js
for(const e of q){const s=byId(e.id);if(!s)continue;
  if(e.op==='zorder'){if(_iS(s.frac)&&s.frac!==e.b)_pu(z,·,{id:e.id,before:e.b,after:s.frac})}
  else if(e.op){const g=s.groupId??null;
    if(g!==(e.b??null)){ g==null ? ungroup-emit : group-emit gid:g }}
  else{ ... if(e.b!==_ud)p.b[e.k]=e.b; if(_JS(s[e.k])!==_JS(e.b))p.a[e.k]=s[e.k] }}
for(const[id,p]of g)_run(()=>{if(_ln(_ok(p.a)))_txC({op:'upd',id,before:p.b,after:p.a})});
```

- `a` is always the **live** value (`s[e.k]` / `s.frac` / `s.groupId`), never
  the queue-time capture.
- The emit is skipped entirely when live already equals the remote's claim
  (`_JS(s[e.k])===_JS(e.b)`, `s.frac===e.b`, `(s.groupId??null)===(e.b??null)`)
  — convergence already happened, nothing to propagate.
- A dead id (`!byId(e.id)`) is skipped — cross-doc leakage of stranded entries
  is now structurally impossible.
- An `upd` whose every key converged emits nothing (`_ln(_ok(p.a))` gate).

`e.b` (the remote's claim) is still emitted as `before`/`groupId` baseline —
it describes the diverged peer's state, which is the emit's purpose.

## Consequences

- The emit contract is now: *"the receiver converges to whatever the sender
  holds at send time"*, immune to mid-apply throws between queue and flush.
- An emit can never revert a write that landed after the queue event — the
  fresh-clock claim always carries the current live value.
- `before` on `upd` remains optional/sparse (ADR-1087's `cov` check does not
  cover `'upd'`), so dropped-before keys don't risk intake rejection.
