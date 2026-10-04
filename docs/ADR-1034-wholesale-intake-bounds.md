# ADR-1034: wholesale intake bounds — audit of the snapshot/`replace` aux-field surface

## Status

Accepted (v1.8.060). Clean — no divergence found; contract pinned.

## Scope

Every message whose payload carries *collections* that flow into board state,
with emphasis on the `snapshot` family (the largest attackable surface):

| Field | Path | Bound |
|---|---|---|
| `msg.shapes` | `_applySnapshot` | `_s0(…,SHARE_MAX_SHAPES)` + `validShape` each + `_tAlive` tomb gate |
| `msg.ops` | merge loop | `_s0(…,SHARE_MAX_SHAPES)` + `op.clock.peer===msg.peer` envelope binding (0932) |
| carried op | `_mergeSnapshotOp` → `Store.applyRemote` | `'add'`-only gate, then `validRemotePayload` — never applied directly |
| `o.wc` (per-shape clock map) | `_wAdopt` / merge loop | `!_iO` reject, `keys>64` reject, per-key `validClock`, structural/`__proto__`/`constructor`/`prototype`/`_x` key skip |
| `msg.pages` | `_pgAdopt` / union-heal | `_vPages` (id/name/nts/ntp gates) + 64-entry cap + `_pgHealS` `?`-stub for orphan `pg` |
| `msg.rep` | causal marker | `validClock` + `clockNewer` ordering both directions |
| `msg.name`/`nameTs`/`namePeer` | docName LWW | `_iS`+`_s80`, `_tsOK`, `_idOK` |
| `op.after`/`afterWc` (`replace`) | `validRemotePayload` | `≤MAX_OP_SHAPES` + `validShape` / `wcOk` |
| `op.connClears` (`del`) | `validRemotePayload` | `_ccOk` whitelist + count cap |

## Findings

- **Adopt path** (`_applySnapshot`, empty board): shapes bounded + validated +
  tomb-filtered; wc maps adopted only through `_wAdopt` (count + per-key
  clock validity + key whitelist); `pg` orphans materialize `?` stubs via
  `_pgHealS` — no unbounded or unvalidated write reaches `state`.
- **Merge path** (`_mergeSnapshotOp`): non-`'add'` ops skipped outright;
  unknown shapes re-enter `applyRemote` (full `validRemotePayload` +
  `validClock` + envelope binding applied upstream); known shapes merge
  per-prop with `validClock` + `validPatch` + structural-key skip + `_typOK`
  on `type` + parked-img drop on non-adopted refs (0745/0746).
- **Forged flood residual**: a crafted `wc` map could add junk prop clocks
  within the message-size bound (256KiB msg / 24MB frag stream); each key is
  `validClock`-gated and the global 8192-entry wclock sweep (0738) collapses
  to tombstones on the next `del`. Bounded memory only, no convergence break
  — accepted.
- Old-version records with `@`-marked img refs (ADR-1033) stay parked forever
  on the old build — benign degradation, no corruption (documented there).

## Contract rule for new wholesale/carried fields

1. Every array field → slice-bound (`_s0(x,SHARE_MAX_SHAPES)` or the kind's
   cap) *before* iteration or validation.
2. Every clock map → entry-count cap + per-key `validClock` + the structural
   key skip (`_wAdopt` idiom).
3. Ops carried inside another message → envelope-peer binding
   (`op.clock.peer===msg.peer`) + funnel through `Store.applyRemote`.
4. Page sets → `_vPages` + 64 cap; orphan `s.pg` → `_pgHealS` stub.
5. Causal/name markers → `validClock` / `_tsOK` / `_idOK` / `_s80` gates.

## Pins (test.mjs)

- Source: bounded `msg.ops` loop w/ envelope binding; bounded+validated adopt
  filter; `_wAdopt` 64-key cap; `'add'`-only snapshot-op gate.
- Behavioural: forged `clear`/shape-less ops → `'skip'`; invalid shapes
  filtered from adopt; >64-key `wc` rejected wholesale; legit small `wc`
  adopted; `__proto__` key never enters `wclock`.
