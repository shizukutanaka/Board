# ADR-0921: connClears backward apply LWW-gates per-key restores

## Status

Accepted (2026-10-01)

## Context

`del` and `pageDel` both carry `connClears` — per-connector `{id, before, after}`
records of the endpoint bindings the delete stripped. Forward apply writes
`p.after` keys; backward apply (undo) restores `p.before`.

Every other backward path that restores properties — `upd`, `style`, `resize`,
`move`, `zorder`, `group`/`ungroup` — gates each restored key through
`_lwwSkip(id, key, op)`: if another peer's wclock for that key is newer than
the undo op's clock, the key is not reverted. connClears was the only backward
path that bypassed the gate: it restored the whole `p.before` object via
`_oa(sh, p.before)` unconditionally.

Under clock skew this diverged. Take a remote `upd` whose clock `ts` sits ahead
of the undo clock (skewed wall clock, or an older commit undone late):

- On every peer, the undo-wire `upd` arrives and `_lwwDrop` drops the
  connector-key writes because `clockNewer(remoteWc, undoClock)` — the skewed
  remote binding survives.
- On the undoing peer, the raw `p.before` restore clobbered `s.a` back to the
  pre-delete value — the skewed remote binding was lost.

Local board said `a=oldTarget`, every peer said `a=remoteTarget`: divergent
bindings with no heal path (each side's wclock claims victory).

## Decision

`_ccRest(sh, before, op)`: clone `p.before`, delete each key where
`_lwwSkip(sh.id, k, op)` holds, then `_oa(sh, pb)` — identical shape to the
other backward paths' per-key gate. Applied at both connClears backward sites:

```js
// del backward (~1666) and pageDel backward (~1774)
if(op.connClears)for(const p of op.connClears){
  const sh=byId(p.id);
  if(sh&&!sh.locked)_ccRest(sh,p.before,op)}
```

Folded once into a helper since the two sites were identical (~120B saved).

The `!sh.locked` guard (ADR-0760/0711 parity) is unchanged; `p.after` shape is
untouched — forward apply still uses the `p.after`-guarded `_remoteDelConnFix`
path (ADR-0920).

## Consequences

- connClears undo now converges with peers under clock skew: skewed remote
  bindings survive on all sides, un-raced keys still restore.
- test.mjs pins the behaviour: remote write with future `ts` → binding kept,
  un-skewed keys restored (3 asserts).
- `pass += 1883` (prev 1880 + 3).

## References

- `_lwwSkip` (~1892) — shared reverse-apply LWW gate.
- `_lwwDrop` (~1500) — the forward-side peer equivalent that motivated parity.
- ADR-0920 — `after:null` forge on the forward path (paired connClears audit).
- ADR-0717 — undo arbitrates under the fresh undo-wire clock.
