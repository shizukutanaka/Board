# ADR-1078 — `_park` intake bounds: pending-map keys and refs are wire ids

Status: Accepted (round828, v1.8.102)

## Context

`_park(P,id,k)` installs a parked `img:'k:N'` ref into `_imgPending` (256-cap
FIFO, 60s deadline, ADR-0835/1046) so a shape whose blob hasn't arrived can
be healed by `imgq` and resolved by the `img` case. Six sites feed it:
`_attachShape` (snapshot/op/install paths), `_oa` (patch funnel), `_pcR`
(post-purge re-park), `_imgRescan` (slow expiry re-park), and the two
img-ref repark sites in `_onRecv`.

## Defect

`_park` (and every caller's `_iS`-only guard) stored **any** string as both
the map key (`s.id`) and the ref value (`s.img`):

1. `_attachOp` → `_attachShape` parks *before* `validShape` runs (the
   snapshot path is `map(attachShape).filter(validShape)`; the op path
   attaches the shape then hands it to `applyRemote`, which may still
   reject). A forged `add`/snapshot carrying `id:"x".repeat(1e6)` +
   `img:'k:0'` plants a megabyte-long key in `_imgPending` — up to 256 slots
   × attacker-sized keys retained for the 60s deadline.
2. An oversized `s.img` ref (>64 chars) can never be answered: the `img`
   chunk key bound is 64 at intake and `imgq` keys are now `_idOK`-gated
   (ADR-1077). The shape is still valid, so `_imgRescan` re-parks it forever
   → a permanent low-duty imgq request that always dies at the receiver —
   quiet spam plus a dead slot in the 256-entry waitlist crowding out
   healable refs.

## Fix

One gate inside the primitive covers all six call sites:

```js
const _park=(P,id,k)=>{if(!_idOK(id)||!_idOK(k))return; ... }
```

`_idOK` (string ≤64) is the same bound shape ids take in `validShape`
(ADR-0388) and wire keys take at `img`/`imgq` intake — anything failing it
was either invalid (the shape gets filtered next anyway) or unanswerable
(ADR-1077's gate drops the request at the receiver). Legitimate refs are
≤64 by construction (`k:N` slim ordinals, `@`-stripped foreign refs,
content-hash keys), so no healable ref is lost.

## Behavioural pins

- A forged `add` op with a 4 KB shape id + `img:'k:1'` parks nothing.
- A forged `add` with a valid id but a 200-char `img` parks nothing.
- A valid id + `img:'k:N'` still parks (heal path intact).

## Verified clean alongside

- `sync-req`'s causal-horizon `wc` is fully sanitized in `_reqWc`:
  ≤`SHARE_MAX_SHAPES` entries, `_idOK` keys, `validClock` values, malformed
  → `null` → full snapshot (a lying asker only starves itself).
- `msg.dels` tomb deltas: count-bound + `_idOK` + `validClock` per entry.
- `msg.peer` is bounded at the envelope (`MAX_PEER_ID_LEN`, `rtc:` forgery
  rejected on BC — ADR-0827), so `_imgChunks` `key|peer` slot keys are
  bounded transitively.
- `img` chunk stream bounds are complete: per-sender slot, 96KB chunks,
  joined ≤12MB, aggregate ≤24MB, hash+type verified (ADR-0864/1068).
