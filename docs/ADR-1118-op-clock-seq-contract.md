# ADR-1118: op-clock seq contract — one monotonic counter per launch, dedup keys launch-unique

Status: accepted (audit complete — clean pass, contract pinned)

Date: 2026-10-01 (round868)

## Context

Every op clock is a triple `(peer, seq, ts)` consumed by two distinct
machineries:

- **dedup** — `_ck(op) = clock.peer + ':' + clock.seq` keys `state.seenOps`;
  a redelivered op whose key is present is dropped (`Store.commit`,
  `applyRemote`, undo-wire intake).
- **arbitration** — `clockNewer(a,b)` orders writes as
  `ts → peer → seq`; the seq term is the intra-peer tie-break (ADR-0979).

For dedup to be correct the `(peer,seq)` pair must be unique per emitted op —
**forever**, across reloads, redeliveries, and undo restamps. Round868 audited
every seq mint and seq-typed value that can reach a clock.

## Findings

### One mint, one counter

All op clocks come from `{peer:_pi(), seq:++state.seq, ts:nowTs()}`:

- `_fck` — the canonical helper used by `commit` (`if(!op.clock)_fck(op)`) and
  `redo` (ADR-0718).
- `undo` restamps the recorded op with `seq:++state.seq` and gives each
  `_undoWire` op its own `++state.seq` — distinct keys per inverse (the dedup
  comment is explicit).
- The remaining inline twins (`:2195`, `:2215`, `:7120`) are the same shape.

`state.seq` is **not persisted** — it resets to 0 each launch. That is safe
only because `state.peerId` carries the ADR-0459 per-launch incarnation suffix
(`PEER_ID+'.'+uid().slice(0,6)`): a relaunched tab reuses seqs 1,2,3… under a
*fresh* peer id, so the dedup keys `newPeer:1`, `newPeer:2`… can never collide
with the `oldPeer:1`, `oldPeer:2`… keys peers already recorded. The seq
counter need not survive reload — the peer identity does the scoping.

### `seq:'snap:'+id` — a string seq that never arbitrates

Snapshot-embedded adds mint `{peer:_pi(), seq:'snap:'+s.id, ts:0, _snap:true}`.
The seq is a **dedup-key-only** value: `ts:0` means `clockNewer` can never
let it win an arbitration (any real clock out-ranks ts:0), while the
`'snap:'+id` key dedups the same re-broadcast snapshot shape. `validClock`
accepts a non-empty string seq ≤80 (ADR-0779) precisely for this lane.

The seq tie-break inside `clockNewer` is intra-peer only (the `a.peer!==b.peer`
branch returns first). A mixed string/number seq comparison under an equal
`(ts,peer)` evaluates `a.seq>b.seq` as `false` in both directions — a
deterministic not-newer, never a crash or an order inversion.

### Non-persistence edges are already closed

- `seenOps` itself is session-local and bounded (MAX_SEEN_OPS, oldest-20%
  trim); an evicted key re-applying an op is safe because re-application is
  idempotent (ADR-0655/0657).
- A peer that *did* see the old incarnation's ops retains those keys under the
  old peer id — they expire naturally, never collide with the new incarnation.
- `Persist` never serializes `state.seq`; no stale counter can be rehydrated.

## Decision

No code change required — pin the contract: every emitted op clock consumes a
fresh `++state.seq` under the incarnation-suffixed peer id; `'snap:'` seqs are
dedup-only at `ts:0`; the intra-peer seq tie-break stays a total order.

## Consequences

- The op-clock domain is closed: mint uniformity (this audit), HLC ts
  (0739/1114/1115), peer↔envelope binding (0931/0932/0941), string-seq bounds
  (0779), arbitration totality (0979).
- Persisting `state.seq` in a future change would be *incorrect* (it would
  re-share keys across incarnations only if peerId lost its suffix) — the pin
  asserts both halves of the invariant so either regression fails loudly.
