# ADR-0934: wire op auxiliary-field bounds audit

## Status

Accepted (2026-10-01) — audit complete, no defect

## Context

Every op carries auxiliary arrays/maps alongside its primary payload
(`ids`, `shapes`, `changes`, `connClears`, `wc`/`afterWc`, `gids`,
`pages`, `before`/`after` patch lists). Each is a potential unbounded
flood or a validation gap — this round audited every aux field against
the intake validator (`validOp`).

## Findings

All aux arrays are bounded at intake:

| op | aux fields | bounds |
|---|---|---|
| `addMany` | `shapes`, `wc` | ≤MAX_OP_SHAPES + `wcOk` |
| `del` | `shapes`, `connClears` | ≤MAX_OP_SHAPES + `_ccOk` whitelist |
| `clear` | `shapes` | ≤MAX_OP_SHAPES |
| `replace` | `after`, `afterWc` | ≤MAX_OP_SHAPES + `wcOk` |
| `move` | `ids`, `after`/`before` | ≤MAX_OP_SHAPES + `patches()` |
| `zorder` | `changes` (id≤64, frac≤600) | ≤MAX_OP_SHAPES |
| `style`/`resize`/`beautify` | `after`/`before` | `patches()` + noLock |
| `align` | `after`/`before`, `dir` | `patches()` + DIRS whitelist |
| `group`/`ungroup` | `ids`, `gids`, `before` | ≤MAX_OP_SHAPES + id/gid ≤64 |
| `pageAdd`/`pageDel`/`pageName` | `shapes`, `firstId`, `nts` | ≤MAX_OP_SHAPES + bounded scalars |

Shared helpers: `patches()` = array ≤MAX_OP_SHAPES, id≤64,
`validPatch` per entry; `wcOk` = ≤MAX_OP_SHAPES keys, every value a
`validClock` map; `_ccOk` = `_CC_KEYS` whitelisted + `validPatch`.

**`move` delta branch is unreachable on the wire**: `validOp` requires
`op.after` to be a `patches()` array (ADR-0741 absolute positions), so
apply always takes the `_mp` absolute branch; the `dx/dy` delta path only
runs on local undo of locally-committed ops — wire input can never
exercise it. `dx`/`dy` remain shape-validated (`_iN`/`_fin`) for
tolerance but are never applied remotely.

**`pageAdd.i`** is `_fin`-bounded only, but `splice(i,0,p)` clamps at
length — magnitude is harmless.

## Decision

Documented as the audit-complete record. A source pin freezes the
absolute-position requirement on `move` so the dead delta branch can
never become wire-reachable again.
