# ADR-1046: parked-ref waitlist boundedness & ordering audit

Date: 2026-10-01. Status: accepted (audit — clean, pins added).

## Scope

`Net._imgPending` is the waitlist of live shapes holding an unresolved
`img:` ref — entries `{k: blobKey, t0: parkTime}` keyed by shape id. A
heartbeat tick re-asks `imgq` for entries older than two presence
intervals and drops the entry after a 60s park expiry (ADR-0835).
`_park(P, id, k)` is the single insertion site (ADR-0842).

## Verdict: clean — bounded waitlist with self-healing exits

| Concern | Result |
|---|---|
| Unbounded growth via hostile/buggy refs | Bounded — `_park` caps at 256 entries (`P.size>=256&&!P.has(id)` → evict oldest). A 500-shape flood of bogus refs parks at most 256, each re-asking at the 10s-throttled imgq rate for ≤60s — the wire amplification is bounded by construction. |
| Eviction = lost heal | No — evicted entries keep `shape.img`. The ADR-0629 straggler scan (`s.img===msg.key` over all shapes) resolves a parked shape on blob arrival even without a pending entry; park expiry likewise leaves the ref for any later blob (bounded heal window, no permanent loss while the shape lives). |
| Re-park `t0` refresh | Intentional — `_pcR` re-parks surviving refs after a wholesale purge (`_pcC`), resetting `t0` so the imgq retry loop survives swaps (ADR-0985). A never-arriving blob gets a fresh 60s window per swap — repeated *finite* bursts, still bounded. |
| Eviction order vs `t0` order | Consistent — `Map.set` on an existing id keeps the insertion slot, so FIFO order is by first park; a `t0`-refreshing re-park does not jump the queue (eviction stays oldest-first). |
| Duplicate keys across many shapes | Bounded — N shapes sharing one key eat N waitlist slots, but the cap still holds and a single arriving blob resolves all of them in one straggler scan. |
| Dead-shape entries | Purged — `_psc(id)` deletes the pending entry on shape deletion; `_pcC`+`_pcR` wipe-and-rebuild on wholesale swaps (pages, replace, clear). |

## Contract for new parked-ref paths

1. All waitlist inserts go through `_park` — never `P.set` directly — so the
   256-entry bound is the only growth path.
2. Re-parking an existing id refreshes `{k, t0}` *in place*; do not delete
   and re-set (that would rotate the FIFO order).
3. A parked shape keeps its `img` ref until blob resolution or park expiry —
   no other path may clear `shape.img` (resolution and expiry are the only
   exits; persistence marks foreign `:`-chained refs `@` per ADR-1033).
4. New wholesale-swap paths that drop shapes must re-run `_pcR` (or the
   equivalent re-park) so surviving refs keep their heal loop.

## Pins (test.mjs)

- 258 unresolved refs → `_imgPending.size <= 256`, oldest evicted, newest
  kept.
- `Map.set` on an existing id keeps the insertion slot (FIFO is by first
  park, not last refresh).
