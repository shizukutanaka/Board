# ADR-0920: connClears `after:null` forged entries — crash + rescan suppression

Status: accepted (2026-10-01, v1.7.946)

## Context

Post-structural-key-cluster (ADR-0912–0919) audit of the wire `del`/`connClears`
apply path. A `connClears` element is `{id, before, after}`: `before` records the
endpoint binding the peer observed (`a`/`b`/`aF`/`bF`), `after` carries the
detach patch `{x1,y1,x2,y2}` plus implicit `a:null,aF:null`/`b:null,bF:null`.

## Defects

1. **Mid-apply TypeError → tombstones + partial apply.** The `del` forward
   connClears apply loop read `p.after[x]` unconditionally whenever
   `before[e]!=null`. A forged entry `before:{a:<live-id>}, after:null` passed
   `_ccOk` (`after` is not a required key) and crashed at
   `p.after['x1']` *after* `del` had already written the member tombstones and
   removed the shapes — so `_stampWrites`, `_rdb`, and the `_remoteDelConnFix`
   gap-bound rescan never ran. Peers kept the conn as an orphan shape with
   divergent wclocks while the local board partially applied.
2. **Rescan suppression.** `_remoteDelConnFix`'s `handled` set listed every
   `connClears` entry's `p.id`, including `after:null` entries that applied no
   detach write. A conn whose forged entry was skipped by the `p.after` guard
   (or crashed mid-apply) was therefore also skipped by the rescan → it kept a
   dangling `a`/`b` binding to a deleted shape.

## Decision

- `del` forward apply: gate the endpoint-detach write on `p.after` —
  `if(pb[e]!=null && p.after && !locked(before-target))`.
- `_remoteDelConnFix`: `handled` only contains entries that actually applied a
  write — `(op.connClears||[]).filter(p=>p.after).map(p=>p.id)`. Entries that
  applied nothing leave the conn inside the gap-bound rescan, which detaches it
  locally exactly like an un-`connClears`-ed conn.

## Pin

`test.mjs` behavioural block: forged `del` op with
`connClears:[{id:'cn1',before:{a:'gs1'},after:null}]` — member removed, conn
survives, `cn.a===null` via the rescan, and no forged endpoint clocks were
stamped (the op completes without throwing).

## Notes

- `connClears` backward apply (`_oa(sh,p.before)`) is local-undo-only and was
  already symmetric — `before` is required by `_ccOk`, `after` is not.
- Companion rules: ADR-0760 (locked ids survive, keep bindings),
  ADR-0758 (gap-bound conn rescan), ADR-0761/0762 (connClears lifecycle).
