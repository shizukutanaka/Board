# ADR-0978: sortZ total-order & iteration-order audit — clean

Status: accepted (2026-10-01, v1.8.004)

## Context

Peers can hold `state.shapes` in different array orders (add order, undo
restores, snapshot union-heal). Render z-order is `state.shapes` sorted in
place by `sortZ` — if its comparator were not a strict total order, equal
elements would keep input order and the peers' paint stacks would diverge.

## Audit

`sortZ` comparator:

```js
(a,b)=>a.frac<b.frac?-1:a.frac>b.frac?1:a.id<b.id?-1:a.id>b.id?1:0
```

- **Antisymmetric + transitive**: `frac` is a string comparison over the
  keyBetween base62 alphabet, then `id` string tie-break. Returns 0 only for
  identical ids, which can't coexist (wholesale dedupe ADR-0790, remote adds
  `!byId(id)`).
- **Null handling**: keyless shapes are stamped *before* the sort, so the
  comparator never sees `frac == null` on one side. Mixed-type frac can't
  arrive remotely — `frac` is a structural key (stripped from upd/style
  patches, ADR-0913) and `zorder` changes carry validated strings.
- **NaN z can't enter**: `z` is required `typeof number` by `validShape`, and
  `_cleanVal` rejects non-finite numbers — so the legacy seed
  `(a.z||0)-(b.z||0)` can't produce NaN.
- **Legacy seed determinism**: keyless boards sort by `z` then `reindexFrac`
  stamps keys in that order. Equal-`z` ties follow input order — but input
  order is itself convergent (op order), so peers still agree.
- **`keyBetween` robustness**: digits outside the base62 alphabet map to 0
  and the exhausted-prefix guard terminates — malformed frac strings still
  compare consistently as strings everywhere.
- **Iteration-order derived ops**: `connClears`, `group`/`ungroup` id lists,
  `del`/`addMany` arrays are all per-id idempotent on apply — their element
  order carries no semantics, so Map/Set iteration order can't diverge state.
  `_uniq` keeps first occurrence (deterministic).

## Decision

No code change; contract pinned behaviourally: identical `frac` orders by
`id` regardless of input order, and keyless legacy shapes seed by `z` then
get stamped. Any future comparator/frac writer must preserve the
frac→id total order.
