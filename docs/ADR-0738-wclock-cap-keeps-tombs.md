# ADR-0738 — wclock flood cap は墓標を保持する

**Date**: 2026-09-29 · **Status**: Accepted · **Area**: wire convergence / DoS bounds

## Context

The del-forward path caps `state.wclock` at 8192 entries as a hostile-flood
guard (ADR-0734): a peer could otherwise grow the per-property clock map
unboundedly. The cap's implementation was `state.wclock={}` — a wholesale wipe
that discarded **tombstones along with prop clocks**.

The two entry kinds have different failure costs:

- **Prop clocks** (`{prop:clock}`) are *self-healing* — losing one merely means
  the next write wins unconditionally for that prop; convergence catches up on
  the following op.
- **Tombstones** (`{_del:clock}`) are *not* self-healing — losing one means a
  stale in-flight 'add' can resurrect the deleted shape on this peer only; no
  later traffic repairs the divergence (the sender's board stays deleted).

So under flood the cap was reopening the exact divergence class the tombstones
exist to close — adversary-flooded clocks could even be used deliberately to
evict real tombs.

## Decision

At the cap, keep tombstones and drop prop clocks:

```js
if(_ok(_wc()).length>8192){
  const t={};for(const[id,w]of Object.entries(_wc()))
    if(w._del)t[id]={_del:w._del};
  state.wclock=t;
}
```

`_del` is the only key preserved — a tomb entry's prop clocks (written before
the shape died) are dead weight anyway. Fake-id tomb floods are harmless: a
tomb only ever affects the id it names.

## Verification

- 3 behavioural asserts: a tomb survives the cap while prop-clock entries are
  dropped, and a post-cap stale add is still rejected.
- `node test.mjs` → 2720 pass / 0 fail.
