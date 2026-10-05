# ADR-1045 — snapshot img puts join the answer store

## Status
Accepted (round794, image blob availability lifecycle audit)

## Context

Blob availability end-to-end: local ingest → `Persist` `imgs` store →
`_imgSlim` dedup/chaining → wire refs (`img:'k'`/`'k:N'`) → `_imgIn`/`_imgSent`
blob stores → parked waiters (`_imgPending`) → imgq re-requests (`_imgqT`
throttle) → `imgs`-store GC on save.

The audit found one availability hole: two blob lookup stores back the `imgq`
answer path — `_imgIn` (received blobs) and `_imgSent` (blobs this peer has
slimmed onto the wire, byte-bound at 64MB). Every wire ref emitted with a key
*should* be answerable from one of them.

## Finding

`_snapshotMsg()` passes a throwaway `sent` map to `_slimShapes` so every blob
re-emits for late joiners. The throwaway map meant the blob registered for
dedup but **never entered `_imgSent`** — so a snapshot-carried `img:` key was
unanswerable by construction.

Reachable trigger: a joiner processes the snapshot's `img` chunks into
`_imgIn`, then loses the key to `_imgIn`'s 256-entry/64MB eviction before the
referencing shape arrives (or the shape arrives via a different path). The
shape parks, ages past the imgq sweep, and asks — the sender still holds the
blob (live `dataUrl`, IDB `imgs` store) but `_imgSent` misses → park expiry at
60s → permanent placeholder despite a willing answerer.

## Decision

In `_slimShapes`, when a `sent` dedup map is provided (the snapshot path), also
register each put into `this._imgSent`, then apply the shared 64MB byte bound
to `puts` from either path:

```js
for(const[k,d]of puts){_pu(this._imgOuts,[k,d]);if(sent)this._imgSent.set(k,d)}
if(_ln(puts)){/* shared byte bound on _imgSent */}
```

- Idempotent: `Map.set` on an already-registered key writes the same value and
  keeps its insertion slot (no order churn, no double counting).
- No over-retention risk: the 64MB bound now covers snapshot-registered blobs
  too, evicting oldest first.
- The `'@'`-marked foreign refs stay unaffected (they only flow through the
  persist/export `fmark` branch, never the wire).

## Audited and confirmed clean

| Surface | Result |
|---|---|
| `_imgSlim` dedup/chaining (`k` → `k:N` ordinals) | deterministic per store; `'@'` marks foreign ordinals on persist (ADR-1033) so a local `:N` hit can't alias a foreign ref |
| imgq requester loop | bounded — re-ask from 2×heartbeat to park expiry at 60s, 10s per-key answer throttle; the shape's `img:` ref still heals from any later blob with the key |
| `imgs`-store GC on save | live set = current doc refs + `:prev` backup refs; `'@k:N'` keys never match stored `k:N`, parked foreign refs don't pin local blobs |
| `_imgIn` eviction (256/64MB) | only removes surplus; the straggler `_sh()` scan (ADR-0629) resolves late-arriving refs |
| `_imgSent` eviction | self-heals on the next slim (evicted key re-registers + re-emits) — now also fed by snapshot puts |

## Contract for new blob paths

1. Any emission of an `img:` ref to the wire must leave its blob reachable in
   `_imgSent` (or `_imgIn` for received) — the imgq answer lookup touches only
   those two maps.
2. New queued-out blob sends go through `_slimShapes` so dedup, registration,
   and the byte bound stay unified.
3. `:N`-suffixed refs are per-store ordinals — never resolve them against a
   foreign store's map.
4. Parked refs must stay bounded by the 60s heal window; permanent park is a
   leak.

## Behavioural pins (test.mjs)

- Snapshot-path `puts` register into `_imgSent` and an `imgq` for a
  snapshot-carried key answers with the blob (2 asserts).
