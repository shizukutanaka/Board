# ADR-1012: id-index × shape-set mutation integrity

## Status

Audit complete — structurally safe (behavioural pin added, v1.8.038).

## Context

`byId` is the lazy id→shape index shared with the spatial-grid choke
point `_iG()` (ADR-0009). It self-heals on size drift
(`_idIndex.size!==_nS()`), so a missed invalidation can only bite on a
**same-length object-identity swap** — replacing a member without
changing the count (e.g. `shapes[i]=newObj` or splice-with-insert) —
which would serve the dead object to every `byId` consumer while the
array holds the new one (patch writes diverge between consumers).

## Audit table — all 21 mutation sites

| Site family | Pattern | Heals via |
|---|---|---|
| `_apply` del/delMany/pageDel splices | `splice` (length changes) | size-check |
| `_apply` 'clear'/'replace' swaps | `length=0` + push | `_iG()` inline + size-check |
| `_rs` / `state.shapes=` wholesale | array replace | `_iG()` inline |
| pageDel member kill (2155) | `filter` reassignment | `_iG()` + size-check |
| eraser live splice (5757) | `splice` (length changes) | size-check + `_iD`/`_psc` |
| `s.way` splices (4100/4302/4305) | member-array mutation, not the set | n/a — commit `_iG` covers bbox |
| `_pgs()` splices | pages array, not shapes | n/a |
| `_eraseBatch` fills (5758) | separate array | stroke-scoped lifecycle |

**No `_sh()[i]=` (same-index object swap) exists anywhere** — the only
pattern that could beat the size-check is absent by construction.

`_eraseBatch` (the `byId` fallback) is stroke-scoped: filled with clones
during the eraser stroke, emptied at every exit — commit (5764),
gesture cancel (4005/4435, restores non-tombed members + `_iG`),
wholesale swap (`_rs`, 2097). No exit leaves stale batch members
addressable.

## Consequences

- Structural invariant: the index is correct iff (a) membership changes
  always change `_nS()` or call `_iG()`, and (b) same-length member
  replacement stays forbidden. Property mutations can't stale it (they
  don't touch membership).
- Contract: never write `_sh()[i]=x` — replace via splice-with-removal
  or rebuild; if a same-length swap is ever needed, `_iG()` is required.
- Behavioural pin: same-count remote 'replace' → `byId` resolves the new
  id and drops the old.
