# ADR-1092 — rep-independent docName arbitration + writer-clock normalization

**Status**: Implemented (v1.8.116, round842).
**Scope**: `Net._onRecv` `case 'snapshot'`, `Net._applySnapshot`, IDB doc restore — the `docName` LWW subsystem (`_nameTs`/`_namePeer`/`_nameWin`/`_setDocName`).

## Context

ADR-1091 (v1.8.115) moved `docName` LWW adoption onto the `case 'snapshot'` merge path so a rejoining peer learns renames it missed offline. Devin Review on the merged PR found two remaining defects in that fix, both confirmed on read:

## Findings

### F1 (🔴): stale-`rep` early `break` exits before name arbitration

`case 'snapshot'` placed the strict name-arbitration line at the *tail* of the case, after the ADR-0617 stale-rep `break`:

```
if(msg.rep&&validClock(msg.rep)&&state._lastRep&&clockNewer(state._lastRep,msg.rep))break;
```

A snapshot whose swap marker predates our `_lastRep` exits before any name arbitration runs — the mirror image of the divergence ADR-1091 fixed. Concrete failure: Alice renames the doc (ts 100), Bob never sees that `name` msg, Bob performs a local wholesale `'replace'` (his `_lastRep` advances), then Alice's delta snapshot (rep ts 90 < Bob's) arrives — Bob correctly skips the stale shape merge but *also* skips the winning rename forever.

The name clock is an independent LWW domain (`case 'name'` arbitrates it standalone) — a stale rep marker must not gate it.

### F2 (🟡): writer-less adoption keeps the previous `_namePeer`

Every name-clock adoption site updated `_nameTs` and `_namePeer` independently:

```
if(_tsOK(msg.nameTs))_nameTs=msg.nameTs;
if(_idOK(msg.namePeer))_namePeer=msg.namePeer;
```

A snapshot that wins arbitration while omitting `namePeer` (or carrying an oversized one — `_idOK` bound, ADR-0780) adopted the new `ts` but kept the *old* writer. The resulting `(ts, peer)` pair is a clock nobody ever wrote: later equal-ts renames get arbitrated against the stale writer — misattributed tie-breaks that can permanently reject a legitimate rename. Same shape existed at three adoption sites: `case 'snapshot'` tail, `_applySnapshot`, and the IDB doc restore (`d.nts`/`d.ntp`).

## Decision

1. **Hoist name arbitration above the rep gate.** `case 'snapshot'` runs the strict `_nameWin`/`_tsOK` check first, before the stale-rep `break`, so docName converges on every intake path (empty, merge, stale). `_ps()` fires inside the adopt so a name learned on the stale path still persists. The tail line is removed — single arbitration site.
2. **Adopt the `(ts, peer)` writer clock only as a normalized pair, gated on the ts adopt.** Every adoption site writes `_namePeer=_idOK(peer)?peer:''` whenever it writes `_nameTs`. An absent-or-oversized writer is normalized to `''` — the stored clock always equals the clock arbitration compared against (oversized peers are treated as absent, preserving the ADR-0780 anti-bloat bound). Applied uniformly at `case 'snapshot'` (hoisted), `_applySnapshot`, and IDB restore. The arbitration input itself uses `_idOK` too, so the comparator and the stored pair can never diverge.

`case 'name'` needs no change — `msg.peer` is already bounded at envelope intake (`MAX_PEER_ID_LEN`) and both fields adopt under the same gate.

## Consequences

- docName now converges even when the carrying snapshot's swap marker is stale — closing the residual divergence window of ADR-1091.
- The `(ts, peer)` name clock is always a pair somebody actually wrote; equal-ts arbitration is correctly attributed.
- The ADR-0780 pin's contract is refined: an oversized `namePeer` no longer "keeps the previous writer" — it normalizes to `''` (still never lands in IDB).
- No wire-format change: `_snapshotMsg` already emits `name`/`nameTs`/`namePeer` on all paths; older receivers simply benefit once updated.

## Tests

- test.mjs: 5 behavioural pins — stale-rep snapshot still arbitrates a winning docName (rep marker unchanged), a losing name stays rejected, and a writer-less adoption resets `_namePeer` on both the merge and empty paths (subsequent equal-ts rename beats the normalized writer).
- test.mjs: ADR-0780 pin updated — oversized `namePeer` normalizes to `''`.
