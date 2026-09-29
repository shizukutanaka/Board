# ADR-0737 — ローカル import swap 経路にも墓標を書く

**Date**: 2026-09-28 · **Status**: Accepted · **Area**: Store / wire convergence

## Context

ADR-0736 gave 'clear'/'replace' *applied* ops their tombstone write — every
swap-removed id records `{_del:op.clock}` and receiver-side tombs newer than the
swap clock survive. But the three **local** import swaps —
`importBoard`, the `.drawio`/excalidraw/backup-restore paths, and
`importFromHash` — mutate the board *directly* (`_rs(shapes)` +
`_scl();state.wclock={}`) and only then record the 'replace' op via
`Store._recordCommitted` (through `_repC`). `_apply` never runs for them.

That left the divergence class open on the importer's own board:

- every pre-import shape lost its tomb → a stale in-flight 'add' arriving at the
  importer resurrected it — while every *receiver* (whose `_apply` path had the
  ADR-0736 write) dropped it → boards diverge;
- prior `{_del}` entries were wiped instead of surviving max'd — same class as
  ADR-0736, one hop further upstream.

## Decision

`Store._recordCommitted` now does the tomb work for `op.op==='replace'` at
record time, mirroring the `_apply` forward rule:

```js
if(op.op==='replace'){
  state._lastRep=op.clock;
  const inN=_sT(op.after.map(s=>s.id));
  for(const s of op.before)if(!inN.has(s.id))_wc()[s.id]={_del:op.clock};
  for(const[id,w]of Object.entries(op.wc||{}))
    if(w._del&&(clockNewer(w._del,op.clock)||!inN.has(id)))
      _wc()[id]={_del:clockNewer(w._del,op.clock)?w._del:op.clock};
}
```

Because the caller already wiped `state.wclock`, tombs land on the fresh map;
`op.wc` — the pre-swap clock snapshot every `_repC` caller records — is the
source of the prior-tomb restore, exactly like the `_apply` path reading the
pre-swap `state.wclock`. Undo semantics unchanged: the reverse still restores
`op.wc` wholesale.

Scope: one site covers all three local swap callers. `_recordCommitted` for
non-'replace' ops is untouched.

## Verification

- 3 behavioural asserts: removed-before id tombed at the swap clock; a prior
  tomb newer than the swap survives the record path; a stale in-flight 'add'
  cannot resurrect an import-removed shape.
- Existing pins updated: the `wclock empty after replace (import)` assertion now
  expects the tomb instead (intentional semantics change); the ADR-0616 source
  pin matches the new block form.
- `node test.mjs` → 2717 pass / 0 fail.
