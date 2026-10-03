# ADR-1039: wclock restore paths sanitize prop keys

## Status

Accepted (v1.8.065).

## Context

ADR-1037 closed the same class on the IDB `d.wc` intake: keys in a
wclock entry must be real prop clocks or `_born`/`_del`. A `frac`/`groupId`/
`pg` entry is **not** a prop clock — `_lwwSkip`/`_lwwDrop` consult
`wclock[id][k]` for structural ops, so a stamped structural clock vetoes
legitimate `zorder`/`group` writes → silent divergence until snapshot heal.

## Problem

Wire-side restore paths all bypassed the `_wAdopt` filter:

- `'replace'` forward: `state.wclock=_wM(clone(op.afterWc))`
- `'replace'` backward: `state.wclock=_wM(clone(op.wc))`
- backward `op.wc` restores (del / addMany / pageAdd / pageDel): raw
  `for(...) _wR(id,w)` where `_wR` was `_wM(clone(w))` — unfiltered.

`wcOk` at intake gates `validClock` per key but not the key set, so a forged
`op.wc`/`afterWc` entry could plant `{frac:{peer,seq,ts}}` and veto real
zorder ops forever.

## Change

- `_wK(k)` — the shared prop-key filter (excludes `id`, `type`, `pg`,
  `frac`, `groupId`, proto keys, and `_`-prefixed junk; `_born`/`_del`
  re-allowed by callers).
- `_wR(id,w)` now builds a filtered `_wM` entry: ≤64 keys, `_wK` or
  `_born`/`_del`, `validClock`, cloned value — replacing wholesale
  `clone(w)` semantics for all four `op.wc` loops *and* the two
  `clone(afterWc)`/`clone(op.wc)` sites (rewritten as `_wR` loops).
- `_wAdopt` reuses `_wK`, deleting its inline duplicate of the filter.

Net ≈ −30B after comment-tail reclaim.

## Verified

- Forged `afterWc` `{frac,groupId,pg,_junk,__proto__,x}` → only `x` lands;
  a subsequent zorder op applies (no veto).
- Backward `op.wc` with `frac` restores `x` but drops `frac`.
- `_wTb`/`_wD`/`_bT` paths unchanged (they only write `_del`/`_born`).
