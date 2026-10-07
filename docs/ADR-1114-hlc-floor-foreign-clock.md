# ADR-1114 — foreign-clock admission advances the HLC floor on every channel

Date: 2026-10-01 · Status: Accepted · Round: 864

## Context

`state._lastTs` is the HLC-lite monotonic floor that `nowTs()` mints op clocks
above (`state._lastTs = max(Date.now(), _lastTs+1)`). ADR-1113 pinned the
invariant this buys: every stamp a peer has admitted is `<` any future local
clock `ut`, so undo-side arbitration gates (`_lwwSkip`, `_bN`, tomb compares)
can never fire on ops peers applied unconditionally — divergence is
structurally impossible.

The audit question: does **every** path that admits a foreign timestamp advance
the floor?

## Finding — the envelope was the only advance site

`Store.applyRemote` advanced `_lastTs` from `op.clock.ts` — the *envelope*
clock. Every other admission channel embedded foreign clocks the envelope
never described:

| Channel | Embedded clock | Site |
|---|---|---|
| `msg.dels` tomb map | `c.ts` per id | `_onRecv` dels loop |
| merge-op `.wc` records | `rc.ts` per prop | `_mergeSnapshotOp` `rw` loop |
| snapshot `msg.pages` union-heal | `p.nts`, `p.bts` | `_onRecv` pages block |
| `_pgAdopt` adoption | `p.nts`, `p.bts`/`clk` | page-adopt tail |
| `msg.rep` marker | `rep.ts` | `_onRecv` rep adopt |
| `msg.nameTs` (snapshot + `_applySnapshot`) | `nameTs` | both name paths |
| `case 'name'` | `msg.ts` | rename channel |
| wclock primitives | `_del`, `_born`, prop clocks | `_wD`/`_wR`/`_wTb`/`_bT`/`_wAdopt` |

A peer could deliver a snapshot whose embedded tomb clock `ts` exceeded the
undoer's next undo clock `ut`. The undo-side `_bN`/tomb/`_lwwSkip` gates would
then evaluate true on the undoer — while peers' forward applies are
unconditional — resurrecting or killing a shape on one side only.

## Decision

`_fTs = t => { if (_iN(t)) state._lastTs = _max(state._lastTs, t) }` — a single
fold primitive called at all 17 admission sites:

- wclock primitives (`_wD`, `_wR`, `_wTb` ×2, `_bT`, `_wAdopt` `rw` loop) — so
  every *caller* of the primitives inherits the advance (undo restores, dels,
  `_wAdopt` merges, adopt paths).
- `Store.applyRemote` envelope (folded from the inline `_iN`/`_max` form).
- `_onRecv` channels: `dels` loop, `pages` union-heal (rename winner, `bts`
  backfill, new-page adopt), `rep`, `nameTs`, `case 'name'`.
- `_mergeSnapshotOp` `rw` loop and `_applySnapshot` `nameTs`.
- `_pgAdopt` tail (`p.nts`; `p.bts` flows through `_bT`).

`_stampWrites` stamps `C = op.clock` — already envelope-covered, no hook
needed. Snapshot-op envelope clocks carry `ts:0, _snap:true` (ADR-1055) so the
envelope advance is a documented no-op for them — the embedded channels are
where their real clocks live.

Boundedness is unchanged: `validClock`/`wcOk`/`_vPages`/`_tsOK` already reject
stamps beyond wall+5min (`MAX_TS_SKEW`, ADR-0791), so a forged ts cannot push
the floor past the honest horizon.

## Consequences

- The ADR-1113 HLC invariant now holds over *all* foreign-stamp intake, not
  just op envelopes — the undo-side gates are dead by construction on every
  channel.
- A floor advance is idempotent and monotonic; re-delivered stamps cannot push
  it backwards.
- `nowTs()` may mint slightly larger `ut` values after a clock-heavy snapshot
  — harmless, clocks only need to be fresh, not dense.

## Pins (test.mjs)

9 behavioural asserts — op envelope; `dels` tomb; `rep`; merge `.wc`; `_pgAdopt`
birth; `pages` union-heal `nts`; snapshot `nameTs`; `name` msg; a source pin
counting all 17 `_fTs` call sites.
