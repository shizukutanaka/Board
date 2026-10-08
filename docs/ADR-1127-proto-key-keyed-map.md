# ADR-1127 — proto-key × keyed-map audit: every intake filtered, every store Map/null-proto

**Status**: implemented (contract pinned — clean audit)
**Date**: 2026-10-01
**Round**: 877
**Version**: v1.8.151

## Question (Socratic axis)

If a wire payload carries the key `__proto__`, `constructor`, or `prototype` —
as a shape *prop*, a shape *id*, or a wclock record key — can it escape the
intake filters and land as a prototype write or a poisoned store? Audit every
id-keyed store and every key iteration (`for in`, `Object.assign`, spread).

## Findings — clean pass, contract pinned

**Intake filters** — every remote-key path rejects reserved keys before use:

| Path | Gate |
|---|---|
| Op patches (`upd`/`move`/`style`/`beautify`/`group`/`connClears`/`replace`…) | `validPatch` → `_cleanVal` rejects `__proto__`/`constructor`/`prototype` own keys recursively (depth ≤8); `patches()` applies it element-wise |
| Snapshot prop merge (`for (k in rw)`) | explicit `k==='__proto__'||'constructor'||'prototype'` skip at the value gate, after `validClock` |
| wclock restore (`_wR`, `_wAdopt`, `_wTb`, IDB `d.wc`) | `_wK` prop filter: `id`/`type`/`pg`/`frac`/`groupId`/proto keys/`_`-prefix all dropped; only `frac`/`groupId`/`_born`/`_del` whitelisted back |
| Convergence emit (`_emOK`) | proto keys + `_`-prefix + `img`/`dataUrl`/`type`/`locked`/`id`/`pg`/`frac`/`groupId` never emit |
| `Object.assign` sites (`_oa`) | only ever see `validPatch`-cleaned patches |

**Keyed stores** — every id-keyed structure is a `Map` or a null-proto record:

- `state.wclock` and every record: `_wM()` (`Object.create(null)`) — `wclock['__proto__']` is an own data prop, never a setter call. All rebuild/trim sites (`_wD`/`_wR`/`_wTb`/`_wAdopt` + flood trims) produce `_wM()` records.
- `_idIndex`, `_imgSent`/`_imgIn`/`_imgPending`/`_imgqT`/`_imgChunks`: `_mP()` (Map) — reserved ids resolve by hash, not prototype chain.
- `seenOps`: `Set` on `peer:seq` string keys.
- No central `groups` object — group membership lives on `s.groupId` (a value, never a key).

**Reserved ids are inert data**: `_idOK`/`validShape` permit `id:'__proto__'`
(string ≤64) — safe, since every store is Map/null-proto. `for in` over
`JSON.parse`'d wire objects only sees own enumerable data props and is
value-gated at each branch. `clone` = `JSON.parse(JSON.stringify())` preserves
own props but never reintroduces proto writes.

## Why the pin

No defect — but the contract is load-bearing: a future refactor swapping
`_wM()` for `{}`, introducing an `Object.assign` onto `wclock`, or restoring
records without `_wK` would silently reopen prototype pollution (a class fixed
by ADR-0788/0975). 9 behavioural pins freeze the boundary.

## Verification

`node test.mjs` — 4216 pass, 0 fail (9 new asserts):
`__proto__`/`constructor` keys in `upd` patches rejected at intake; a
wc-carried `__proto__` clock skipped at the snapshot-merge value gate while a
legit prop still merges; `_wD('__proto__')` lands as an own record key with
`Object.getPrototypeOf(wclock)===null`; `_wAdopt` drops proto keys and keeps
legit ones; a shape `id:'__proto__'` installs and resolves through the
Map-backed index.
