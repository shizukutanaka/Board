# ADR-1125 — op-path local-winner propagation

**Status**: implemented (v1.8.149)

## Context

ADR-1124 closed the asymmetry on the snapshot channel: when the joiner's local
prop clock beat the responder's, only the joiner kept the newer value — the
room stayed stale forever.

The **live op channel had the same defect**. `_lwwDrop`'s `filt` decides each
prop by `clockNewer(C, w[key])`: on a loss it silently `delete after[key]` —
the local value stayed put, but the sender (and every other peer) kept their
stale value forever. Nothing on the wire ever described that divergence.

Worse, when *every* prop lost, `_lwwDrop` returned false and `applyRemote`
early-returned — discarding anything already queued in `_txE`.

## Decision

The drop branch queues a convergence `upd` into `_txE`, drained by the shared
`_txFlush()`:

```js
else{
  const _v=after[key];delete after[key];
  const s=w&&w[key]&&!clockNewer(C,w[key])&&byId(id);
  if(s){const _l=s[key];
    if(_emOK(key,_l)&&_JS(_l)!==_JS(_v))
      _pu(_txE||(_txE=[]),{id,k:key,b:_v===_ud||validPatch({[key]:_v})?_v:_ud,a:_l})}
}
```

- `b` = the remote's own (dropped) value — the baseline the sender can
  self-detect; `a` = the local winner.
- `_emOK` gates eligibility — same exclusions as ADR-1124 (structural /
  `img` / `dataUrl` / `locked` / `type` / `id` / `pg` / `frac` / `groupId` /
  `_`-prefixed / proto keys, plus `validPatch`).
- Equal values emit nothing.
- `if(!this._lwwDrop(op)){_txFlush();return}` — the whole-op-drops early
  return now flushes the queue instead of discarding it.

## Convergence semantics

The emit is a real `Store.commit` — fresh `{peer,seq,ts}` clock, history push,
broadcast. That has two consequences:

1. The emit legitimately **restamps the prop's write clock** to the local
   peer's fresh clock — so a subsequent remote op must beat the *emit* clock,
   not the clock the dropped prop lost to.
2. The exchange is **two-directional**: the losing side re-arbitrates the
   incoming `upd`; if it still wins it emits back. The clock winner settles
   both sides — no ping-pong, since only dropped props emit and each emit is
   strictly fresher than the op that triggered it.

`state.ro` still swallows the whole drain (`_txFlush` early-returns) — a
read-only board never writes back.

## Tests (21 pins, test.mjs)

- Full-drop emits the local winner even on the early return.
- Partial drop: remote-won props apply while the local winner rides back —
  including `move` ops (per-shape patches).
- Equal values, `img`, `locked`, unclocked props never emit.
- `ro` drains the queue without committing or broadcasting (no stale deferred
  emit on a later flush).

Three pre-1125 pins were re-calibrated to the two-directional contract —
scenarios that asserted a silent unilateral landing now exchange the emits and
assert convergence on the clock winner (the emit's fresh clock can outrank a
subsequent remote op; that is the mechanism, not a bug).

## Size

Severed/over-long comment tails compressed back under the raw ceiling.
