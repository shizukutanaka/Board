# ADR-1128 — local-commit exception boundary: failed applies evict the dedup key

**Status**: implemented
**Date**: 2026-10-01
**Round**: 878
**Version**: v1.8.152

## Question (Socratic axis)

`applyRemote` wraps its apply in `try{…}catch{_sO().delete(k)}` (ADR-1026) so a
remote op whose apply throws can be retried by the next snapshot heal. Does
the *local* commit path share that exception boundary — or does a throwing
`_apply` strand the dedup key forever?

## Defect

`Store.commit` (and the headless emit `_txC`) add the op's dedup key to
`seenOps` *before* applying, exactly like `applyRemote` — but had **no**
catch/evict. If `_apply` threw:

```
_sO().add(k)        // key recorded
this._apply(op)     // throws — partial mutation, no history push, no broadcast
// op can never be retried: any later attempt hits _sO().has(k) → silent drop
```

`commit` is called inside `_txFlush` too, so a single throwing op would also
abort the whole drain — every queued convergence emit lost.

## Fix — parity with ADR-1026

```js
// Store.commit
try{this._apply(op,true)}catch(e){_sO().delete(k);throw e}
// _txC
try{Store._stampWrites(op);_ps();Net.broadcast(op)}catch(e){_sO().delete(k);throw e}
```

Evict first, then propagate — the caller keeps today's failure mode (the op is
not silently swallowed), but the dedup slot is freed so a retry of the same op
(or a later flush containing it) actually applies. No phantom history entry:
the push happens after `_apply`, so a throw leaves history untouched.

## Verification

`node test.mjs` — 4223 pass, 0 fail. New asserts:
- `commit` propagates a thrown `_apply`, leaves no shape, and a retry of the
  **same op object** lands after eviction.
- `_txC` propagates a thrown `Net.broadcast`, retries succeed, the dedup key
  is re-added on the successful call.
- Source pin on `catch(e){_sO().delete(k);throw e}` at both sites.
