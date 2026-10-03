# ADR-1036: existence-clock pairwise merge in `_mergeSnapshotOp` — audit

## Status

Accepted (v1.8.062). Clean — the pairwise max-merge preserves `_tAlive`
ordering; one bounded residual documented.

## Context

`rw` (snapshot-carried `wc`) merges per-key into the receiver's `lw`:
`_born`/`_del` adopt only `clockNewer(rc, lw[k])`. A live shape's snapshot
entry always carries `_born > _del` (the sender's own `_tAlive` says alive).

## Findings

- **Live-sender ⇒ receiver stays live.** Merged entry takes `max(_born)` and
  `max(_del)`; sender-live ⇒ `rw._born > rw._del` ⇒ merged `_born ≥ rw._born
  > rw._del ≥ merged _del` — `_tAlive`/`_tmb` verdicts on the merged entry
  can never flip a live shape into a tomb. ✓
- **Unknown-id path** (`!ex`): `_wAdopt` merges the wc first, then the 'add'
  op re-runs `Store.applyRemote` → `_tmb(wid,op)` — `del > born` keeps the
  tomb (no resurrection), `born > del` resurrects (legitimate rebirth). The
  adopted `wc` is what makes both verdicts match the sender. ✓
- **Residual (accepted):** a forged `wc` carrying `_del` newer than the
  receiver's `_born` but no `_born` installs a tomb on a live shape. Bounded:
  `wcOk` ≤64 keys + `validClock` (≤ wall+5 min). Real `del`/`add` ops gate on
  the op's own clock (`_bN`/`_tmb` compare `wd.*` against `op.clock`, not a
  peer-supplied ordering), so a real convergence op still applies; the live
  shape also remains drawable/editable locally. Not a silent divergence.
- Prop clocks in the same loop already value-gate via `validPatch` +
  `_typOK` + structural/proto skip (0372/0919/0990).

## Contract rule for existence-clock merges

Any new merge path that adopts `_born`/`_del` must merge them pairwise
(independent `clockNewer` per key) — never synthesize a composite verdict
from one side's clocks alone, and never tomb-remove the local shape inline
(removal decisions belong to real `del` ops/`replace` swaps).

## Pins (test.mjs)

- Source: pairwise `_born`/`_del` merge clause; `!ex` → `_wAdopt` +
  `applyRemote` re-run; `_tmb` born-supersede clause.
- Behavioural: live merge keeps `born > del`; forged del-only `wc` installs a
  tomb (residual pin); `del > born` wc → no resurrection; `born > del` wc →
  resurrection lands.
