# ADR-1091: Merge-path docName parity (delta snapshot intake)

**Status:** Accepted — fixed
**Date:** 2026-10-01
**Round:** 841

## Context

Round 841 audited **field completeness parity between the delta-sync response
(`sync-req` → `_snapshotMsg(req)`, ADR-1055) and a full snapshot**. The emit
side is already parity-complete: `_snapshotMsg` always carries
`name`/`nameTs`/`namePeer`, `rep`, and `pages` on the envelope; the delta mode
only narrows `ops`/`shapes` to the asker's causal horizon and adds `dels`
tombstones.

The audit found the one intake-side gap: **`docName` convergence was gated on
an empty board**. The LWW adoption block lived inside `_applySnapshot`, which
`case 'snapshot'` calls only when `_nS()===0`. On the merge path (a rejoining
peer whose board is non-empty) `ops`/`dels`/`pages`/`rep` were evaluated — but
`msg.name` was never read.

## Consequence

A peer that was offline while the doc was renamed rejoins via `sync-req`,
receives the delta response, and heals every field except `docName`. Its stale
name stands forever — no subsequent wire traffic rewrites it (`'name'` kind
messages only fire when someone renames again). The divergence is permanent
and user-visible: the header input, `document.title`, share exports, and the
`.board` `name` field all carry the old name on that client.

## Decision

Hoist `docName` arbitration into `case 'snapshot'` so it runs on **both**
paths, with a *strict* gate on the merge path:

```js
if(_iS(msg.name)&&_tsOK(msg.nameTs)&&_nameWin(msg.nameTs,_iS(msg.namePeer)?msg.namePeer:'')){
  _nameTs=msg.nameTs; if(_idOK(msg.namePeer))_namePeer=msg.namePeer; _setDocName(_s80(msg.name));
}
```

- **Strict clock required on the merge path.** `_applySnapshot`'s `:!0`
  fallback (adopt any clock-less name unconditionally) is kept *empty-board
  only*: on an empty board there is no local rename to lose. On a non-empty
  board an unclocked name cannot arbitrate and must not clobber a local
  rename, so `msg.nameTs` must pass `_tsOK` and win `_nameWin` — the same
  total order `(ts,peer)` as every other docName path (ADR-0618/0699/0701).
- The winner's writer clock is adopted too (`_nameTs`/`_namePeer`), so later
  `'name'` broadcasts and renames arbitrate against the right baseline.
- On the empty path the line is a no-op second evaluation: `_applySnapshot`
  already adopted the clock, so `_nameWin` fails on the equal clock and
  nothing changes.

## Verified parity matrix (all `case 'snapshot'` fields)

| Field | Empty (`_applySnapshot`) | Merge path | Parity |
| --- | --- | --- | --- |
| `shapes`/`ops` | full adopt | `add`-only `_mergeSnapshotOp` | by design (delta) |
| `dels` | shared block | shared block | yes |
| `pages` | `_pgAdopt` | union-heal + order/names LWW | yes |
| `rep` | shared block | shared block | yes |
| `name`/`nameTs`/`namePeer` | lenient adopt | **was: ignored → now strict LWW** | **fixed** |

`msg.pages` union-heal keeps asker-only pages (ADR-0773): page *deletion*
still has no tomb transport — tracked as a candidate for a later round.

## Tests

- Merge path adopts a winning `(ts,peer)` name.
- Merge path rejects a stale name.
- Merge path skips a clock-less name (local rename preserved).
- Empty path keeps the unconditional adopt.
