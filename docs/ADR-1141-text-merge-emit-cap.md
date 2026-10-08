# ADR-1141 — Merged text that exceeds the wire bound can't be emitted: converge on remote

Date: 2026-10-01 · Status: accepted (round891)

## Context

ADR-1123 (and its line-granularity extension ADR-1140) made `upd` text/label
application a 3-way merge: when a remote edit `r` (base `b`) races a live local
value `l`, `_mT3(l,b,r)` produces a union of the disjoint hunks instead of
dropping `l` wholesale, and a `_txE` convergence emit republishes the union so
every peer lands on the same value.

ADR-0865 bounds every prop's serialized weight at intake (`text` ≤ 5000 chars,
other string props incl. `label` ≤ 600), enforced by `validPatch` at *every*
receiver.

## Defect — divergence at the cap boundary

The merger had no awareness of the emit bound. Two peers each holding a
near-cap text (e.g. 5000 chars) editing disjoint lines produce a union of
roughly `|b| + |l-b| + |r-b|` — up to ~10,000 chars.

- `applyRemote` adopted the union locally: the value looked fine in the UI.
- `_txFlush` then emitted a convergence `upd` carrying the over-cap value —
  **dropped by `validPatch` at every peer**. The emitter kept the union;
  everyone else kept `r`. Permanent split-brain on that shape.
- Worse, since the emitted `upd` also carried the union in `after`, a
  *non-merge* peer's undo/redo path or a later snapshot merge could entrench
  whichever side won locally — no path reconverged.

The emit pipeline only reaches values that can be serialized on the wire;
`_mT3` produced a value that cannot.

## Change

`_mT3` takes a 4th parameter — the prop's wire cap — and treats an over-cap
union as a real conflict: return the remote clock winner (`r`) wholesale.

```js
_mT3=(l,b,r,t)=>{
  ...
  const _m = <char-hunk merge> ? ... : <_mL3 line merge>;
  return _m==null || (t && _ln(_m)>t) ? r : _m;
};
```

- `t` is optional (`0`/absent = uncapped) so existing call sites and the
  exported helper keep working.
- Both `upd` hook call sites pass the prop's bound:
  `_tk==='text'?5000:600` — the same expression `validPatch` uses, keeping the
  emit guarantee: *whatever lands locally can always be re-emitted*.
- Convergence is deterministic: all peers compute the same union, all detect
  `>cap`, all keep `r`. No new wire field, no ordering assumption — the same
  property that made the merge safe (everyone derives it from the same
  `(l, b, r)`) carries through the cap check.

## Contract

- A merged text/label over the prop bound is never adopted and never emitted;
  remote wins. The local editor's text is preserved only in the editor's own
  buffer until commit (it then hits the normal intake bound).
- `_txE` entries are never produced for a capped merge (the value equals `r`,
  so `_m===p[_tk]` — the emit arm doesn't fire).

## Pins (test.mjs)

1. `:_mL3(l,b,r);` call passes `_tk==='text'?5000:600` at both hook sites.
2. `_mT3` direct: uncapped unions still union; a union at exactly the cap
   merges; over the cap returns remote; `t=0` is uncapped.
3. Behavioural: a 5000-char local text racing a 5000-char remote edit (8996-char
   union) converges on the remote value with no convergence emit.

## Second-order effects

- A peer that *locally* exceeds the cap (only possible by bypassing the
  editor's own intake bound) still loses wholesale — same as pre-ADR-1123.
- Cheap: one `length` read per merge; no cost when uncapped.
