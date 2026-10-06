# ADR-1049 — Slow re-park for expired image refs

**Status**: accepted (round798, Board v1.8.075)
**Axis**: ADR-1048 improvement candidate P0-b — the 60s imgq window can leave a
permanent placeholder in the quiet steady-state.

## Context

Wire image refs (`s.img = '<contentKey>'`) heal via the imgq protocol: a shape
whose blob hasn't landed parks in `Net._imgPending`; the presence sweep
re-broadcasts `{k:'imgq'}` for entries aged between 2 sweeps and 60s, then
drops the park. The blob's arrival (`{k:'img'}`) resolves the parked entry AND
any straggler shape still holding the ref (ADR-0629), then `_iv()` repaints.

Prior invariants (unchanged):
- `_imgPending` is FIFO-capped at 256 (ADR-0842/1046).
- The 60s park TTL bounds per-ref amplification (ADR-0835).
- `_pcR` re-parks survivors on every wholesale swap (ADR-0985).
- The answer side is bounded: `_imgSent`/`_imgIn` byte+entry caps, one answer
  per key per 10s (ADR-0836/0784/1045).

## Divergence

The expiry comment reads *"the shape's `img:` ref still heals from any later
blob with the key"* — true, but nothing ever **asks** again:

- The park drop removes the shape from the waitlist; the ref stays on the
  shape.
- Re-request only happens while an entry is parked (< 60s).
- Re-park sites are all event-driven (`_pcR` on wholesale swaps,
  `_attachShape` on ingestion). In the quiet steady-state — every park
  expired, no new joiner, no swap — a blob that exists only in a peer's
  `_imgSent`/`_imgIn` is never requested again. The shape sits as a
  placeholder forever while its blob is reachable one hop away.

This is not hypothetical: long-running shared sessions settle into exactly
this state once all peers' parks have expired.

## Decision

`_imgRescan()` — a low-duty-cycle re-park inside the existing 5s presence
sweep, every 60 sweeps (~5 min):

```js
if(++this._imgScanN>60){this._imgScanN=0;_imgRescan()}
```

`_imgRescan` scans `_sh()` for shapes with an unresolved `img:` ref
(`_iS(s.img) && !s.dataUrl`) that are NOT currently parked, and re-parks them
through `_park` (fresh `t0`, 256 FIFO cap reused — boundedness inherits the
existing invariant).

- **Duty cycle**: a re-parked ref asks ~10×/60s window every 5 min ≈ 0.03
  msg/s — bounded and far below the burst the TTL was designed to stop
  (every-5s forever).
- **No t0 clobber**: parked ids are skipped, so a live park's window is never
  refreshed by the rescan (consistent with the ADR-1046 finding that t0
  refreshes only via `_pcR`/re-ingest).
- **`_imgScanN` resets in `Net.init`** — room-scoped like every other buffer.

## Rejected alternatives

- **No expiry (park forever)**: an unanswered ref then asks every 5s
  indefinitely — the exact amplification the 60s TTL exists to bound.
- **Re-park all on every sweep**: same problem with extra steps.
- **Extend the park TTL to ∞/large**: doesn't fix the mechanism — a live park
  still can't outlive `_pcC`/`_psc` purges; the rescan heals regardless of
  which path dropped the entry.

## Contract for new parked-ref producers/consumers

1. Resolve on blob arrival (primary path + straggler scan) and `_iv()`.
2. Re-request only while parked; the rescan restores liveness on a slow
   cadence — never bypass the waitlist TTL by asking unconditionally.
3. `s.img` without `dataUrl` is the single unresolved-ref predicate; keep it.

## Verification

- `node test.mjs`: behavioural pin — `_imgRescan` re-parks the unresolved ref,
  skips resolved/non-img shapes, and preserves a live park's `t0`; source pin
  for the sweep call. 3606 pass / 0 fail.
- Raw index.html: 556,992 B (< 557,056 ceiling).
