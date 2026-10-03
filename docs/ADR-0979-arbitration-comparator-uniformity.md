# ADR-0979: LWW arbitration comparator uniformity audit — clean

Status: accepted (2026-10-01, v1.8.005)

## Context

Every arbitration domain must compare contenders with the *same* total
order, or a write can win on one peer and lose on another (divergence).
`clockNewer` defines the order: (ts, then peer, then seq). This audit
checked every arbitration site uses it — no raw-ts comparisons, and the
name domains that strip `seq` do so on *both* sides.

## Audit

| Domain | Compare site | Order |
|---|---|---|
| prop wclock merge | `_mergeSnapshotOp`, `_stampWrites`, `_lwwSkip`/`_lwwDrop` | full (ts,peer,seq) via `clockNewer` |
| `_born`/`_del` existence | `_bT`,`_bN`,`_tmb`,`_tAlive`,`_wTb` | full via `clockNewer` |
| `_lastRep` swap marker | apply/recv/persist | full via `clockNewer` |
| docName | `_nameWin` | `{ts,peer,seq:0}` both sides |
| page names | `pageName` apply + snapshot union-heal | `{ts,peer,seq:0}` both sides |
| seenOps | `{peer}:{seq}` key | not arbitration — first-arrival dedup only |

- The `nts`/`ntp` and `_nameTs`/`_namePeer` domains carry no `seq` in the
  stored record, so both sides of every comparison synthesize `seq:0` —
  the order stays consistent with the full clock order on (ts,peer).
- `_tsOK` bounds every incoming ts at wall+5min before it can influence a
  comparison (ADR-0791), so a future-ts can't hijack any domain.
- No raw `.ts</>` comparisons remain anywhere on the arbitration paths;
  `nowTs()`'s HLC floor keeps local stamps monotonic (ADR-0926).

## Decision

No code change; contract pinned behaviourally: `clockNewer` order
(ts→peer→seq), `pageName` op arbitration against stored `nts`/`ntp`, and
the snapshot union-heal using the same order.
