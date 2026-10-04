# ADR-1039: wclock restore paths sanitize prop keys

## Status

Accepted (v1.8.065).

## Context

ADR-1037 closed the same class on the IDB `d.wc` intake: keys in a
wclock entry must be real clocks. `pg`, `id`, `type`, proto keys and
`_`-prefixed junk are never stamped as LWW clocks. `frac` and `groupId`
**are** LWW clocks: zorder stamps `w.frac` (ADR-0975) and `_lwwSkip`
consults `wclock[id].frac`/`.groupId` for zorder/group/undo, so a restore
must keep them (see Amendment).

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
  `frac`, `groupId`, proto keys, and `_`-prefixed junk; callers re-allow
  what they need).
- `_wR(id,w)` now builds a filtered `_wM` entry: ≤64 keys, `_wK` or
  `frac`/`groupId`/`_born`/`_del`, `validClock`, cloned value — replacing wholesale
  `clone(w)` semantics for all four `op.wc` loops *and* the two
  `clone(afterWc)`/`clone(op.wc)` sites (rewritten as `_wR` loops).
- `_wAdopt` reuses `_wK`, deleting its inline duplicate of the filter.

Net ≈ −30B after comment-tail reclaim.

## Verified

- Forged `afterWc` `{frac,groupId,pg,_junk,__proto__,x}` → `x`/`frac`/`groupId`
  land, `pg`/`_junk`/proto dropped; a newer zorder op still applies.
- Backward `op.wc` restores `x`+`frac`, drops `pg`/`_junk`; a >64-key map is
  rejected wholesale.
- del→undo with a newer `frac`/`groupId` clock rejects an older concurrent
  zorder/group op (regression pin).
- `_wTb`/`_wD`/`_bT` paths unchanged (they only write `_del`/`_born`).

## Amendment — keep `frac`/`groupId` in `_wR`

The first cut of `_wR` reused `_wK` alone and so also stripped `frac`/`groupId`.
`_wR` serves del/addMany undo (`op.wc`), `replace` forward/backward and the
`replace` keep set, so every delete→undo or swap erased the shape's z-order and
group clocks; an older concurrent zorder/group op then won locally while a
replica that kept the clock rejected it → divergence. `_wR` now re-allows
`frac`/`groupId`. This does not reopen a veto surface: a forged `frac`/`groupId`
clock is no stronger than a forged zorder/group op carrying the same clock, and
both still pass `wcOk`/`validClock`. `_wAdopt` (snapshot adopt) keeps the
unchanged ADR-0927 policy. The earlier test assertions requiring
`frac`/`groupId` to be absent encoded the bug and now assert preservation.
