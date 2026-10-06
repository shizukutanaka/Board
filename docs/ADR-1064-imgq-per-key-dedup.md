# ADR-1064: dedup imgq re-requests per key within a sweep

## Context

`Net._imgPending` is a per-shape-id waitlist: a shape carrying an
`img:K` ref whose blob hasn't landed parks `{k:K, t0}` and the presence
sweep re-broadcasts `imgq{key:K}` once the entry is past the 10s grace
window, until the 60s expiry drops it (ADR-0835/1049). Blob answers are
per *key* — one `img` message resolves every shape parked on that key.

## Problem

The sweep iterated the waitlist and broadcast one imgq per **entry**.
Content-hash addressing makes shared keys common — duplicate a pasted
image, place the same photo twice — so N shapes parked on key K emitted
N identical `imgq{key:K}` every 5s on both transports (BC + RTC
queue). Every answer is keyed, so N-1 of them are pure waste — they
cost wire bytes and `_dcQ` admission for zero additional information.

## Decision

Extract the inline sweep loop into `Net._imgqSweep(now)` and track a
per-sweep `asked` Set:

```js
_imgqSweep(now){
  const asked=_sT();
  for(const[id,e]of this._imgPending){
    if(now-e.t0>60000)this._imgPending.delete(id);
    else if(now-e.t0>NET_PRESENCE_INTERVAL*2&&!asked.has(e.k)){
      asked.add(e.k);this._bcast(_mk('imgq',{key:e.k}))}
  }
}
```

The first live entry for a key asks; same-key siblings skip. Expiry
(60s) and the ADR-1049 `_imgRescan` re-park path are untouched —
`has(s.id)` still gates on ids, not keys, so each shape's park keeps
its own deadline even though they share asks.

## Consequences

- imgq volume per sweep drops from O(pending entries) to O(distinct
  keys): the adversarial bound stays 256, the common shared-image case
  drops to 1.
- No semantic change for requesters: any answer resolves every parked
  shape on the key (the receiver-side pending sweep already keys on
  `e.k===msg.key`).
- Naming the sweep as a method also makes the dedup behaviourally
  testable (previously inline inside the interval closure).
