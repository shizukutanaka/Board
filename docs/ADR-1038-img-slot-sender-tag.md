# ADR-1038: img reassembly slots are per (key, sender)

## Status

Accepted (v1.8.064).

## Context

`_fragIn` learned sender-tagging in ADR-0469: a stream slot is owned by one
`msg.peer`, so a second sender's chunks can't splice-mix into it. The `img`
reassembly path (ADR-0069) kept its slot keyed by `msg.key` alone.

## Problem

`imgq` is broadcast to every peer; **every** peer holding the blob answers
(ADR-0836 O(1) answer). In a room of 3+ where two peers hold the image:

1. P1 and P2 chunks interleave into the single `msg.key` slot.
2. `st.p.join('')` mixes bytes → `_imgHash(data)!==key` rejects (ADR-0864).
3. The parked ref never resolves; `imgq` re-requests every 60s and each
   round-trip interleaves again — **permanent broken image** while ≥2
   holders exist.

The seq-0 restart (ADR-0563) didn't help: it only restarts the shared slot,
so whichever sender sent seq 0 last wins the slot and the other's mid-flight
chunks keep splicing in.

## Change

```diff
+ const kk=msg.key+'|'+msg.peer;   // slot per (key,sender)
+ if(this._imgIn.has(msg.key))break;   // dead streams skip once resolved
- let st=this._imgChunks.get(msg.key);
+ let st=this._imgChunks.get(kk);
```

All slot writes/deletes use `kk`; the completed join, `_imgIn`, and
`_imgPending` drain stay keyed by `msg.key`. `msg.peer` is always a validated
string at this point (intake gate), so no `||''` fallback. First complete
stream wins; later streams hit the `_imgIn.has` early break — no churn.
Sibling slots for an already-resolved key age out via the existing 60s TTL /
64-slot LRU / 24MB aggregate budget (all key-agnostic).

## Verified

- Same-sender `seq===0` restart still lands (`'NEW!'` pin).
- P1/P2 slots coexist; first complete stream lands the blob; the loser's
  remaining chunks are never buffered.
- Hash-mismatch reject still rejects (the `'xz'` mixed-join in the pin test
  was correctly dropped — the check works, it just never got clean bytes).
