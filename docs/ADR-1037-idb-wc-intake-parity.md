# ADR-1037: IDB doc `wc` intake shares the `_wAdopt` gate

## Status

Accepted (v1.8.063).

## Context

`load()` ingests the persisted `d.wc` map (ADR-0460) directly into
`state.wclock`. Before this change it used an older, looser loop:
`for k in d.wc → for p in m → if(validClock(m[p])) wclock[k][p]=m[p]`.

## Problem

The loose loop diverged from the wire-adopt idiom in three ways:

1. **No structural-key skip** — a `pg`/`frac`/`groupId`/`id`/`type` key in
   `d.wc[id]` is stamped as a prop clock. `_lwwSkip`/`_lwwDrop` consult
   `wclock[id][k]` for those keys (`zorder`→`frac`, `group`→`groupId`), so a
   stamped clock **vetoes legitimate ops** — a silent divergence surviving
   until snapshot heal or the 8192 sweep.
2. **No `_`-prefixed junk skip** — only `_born`/`_del` are legitimate
   underscore keys; anything else is garbage memory.
3. **No per-entry key-count cap / clone hygiene** — the wire idiom caps
   64 keys and clones adopted clocks.

The record is self-written, so reachability is tampered/legacy/corrupt
records — but the `_wAdopt` gate is the codebase's single contract for
"merge a remote wclock map" (ADR-1034 rule ②) and costs nothing to reuse.

## Change

```diff
- for(const k in d.wc){const m=d.wc[k];if(_iO(m))for(const p in m)if(validClock(m[p]))(state.wclock[k]=state.wclock[k]||_wM())[p]=m[p]}
+ for(const k in d.wc)if(_idOK(k))_wAdopt(k,d.wc[k]);
```

`_wAdopt` covers `_iO` + `validClock` per key, adds the ≤64-key cap,
structural/proto/junk skips, and `clockNewer` merge + clone (the boot-path
wclock is empty, so merge ≡ write). `_idOK(k)` bounds the outer shape id
like every other wire id cap (0485/0780).

## Verified

- `restoreBackup` carries no `wc` — the `:prev` record never persists clocks;
  restored shapes intentionally start a fresh causal generation (matches
  `'replace'` semantics) — **not** a defect, documented here.
- `state.wclock` is `_wM()` (null-proto) at every assignment site — the
  outer map was already proto-safe; the gap was prop-level structural keys.

## Pins (test.mjs)

- Source: single-line funnel `_idOK` + `_wAdopt`.
- Behavioural via `Net._applySnapshot`: legit prop + `_born` clocks adopt;
  `frac`/`groupId`/`pg`/`id`/`_junk` skipped; forged `__proto__` key never
  enters `state.wclock`.
