# ADR-1063: imgq answers consult the durable blob store

## Context

A shape's image bytes are content-addressed (ADR-0031/0069): the wire
carries `img:k` refs and blobs move separately, re-requested via `imgq`
when a parked ref's blob never arrived. Answering an imgq is O(1) by
design (ADR-0836): it consults two in-memory stores — `_imgSent` (keys
we slimmed onto the wire) and `_imgIn` (blobs we received). Both are
per-session: `Net.init` clears them on every room switch, and a page
reload wipes them entirely.

The durable side is IDB `imgs` — the same content-hash keyspace holds
every blob the local doc persists.

## Problem

A holder that reloads (or re-joins) has an empty `_imgSent` and
`_imgIn`, while its blobs still sit in the durable `imgs` store. Any
peer holding a parked ref for one of those keys gets a **silent miss**:
no answer, no error. The parked shape waits for the 5-minute
`_imgRescan` re-ask — which misses again — so the placeholder persists
until the holder happens to send an op carrying that shape (which may
never happen). In a 2-peer room there is no alternate responder, so the
starvation is total.

Separate issue: imgq *misses* consumed no throttle — only answers
stamped `_imgqT`. A forged imgq flood of distinct keys therefore cost
unbounded per-key work, and with an IDB fallback it would also cost an
unbounded read rate.

## Decision

```js
const d0=this._imgIn.get(msg.key)||(_idOK(msg.key)?this._imgSent.get(msg.key):null);
if(!_qt||_t-_qt>10000){
  if(this._imgqT.size<4096)this._imgqT.set(msg.key,_t);   // misses stamp too
  if(d0){ ...stage into _imgOuts, gated by _stgOK... }
  else if(_idOK(msg.key))this._imgDbGet(msg.key);
}
```

`_imgDbGet` issues a `readonly imgs.get(key)` on the already-open
`Persist.db`; on success the blob stages into `_imgOuts` through the
exact same `_stgOK` byte bound + `_flushImgOuts` path as a memory hit —
no new outflow semantics. Failures (no db, tx error, missing key) are
silent no-ops, matching the old miss behavior.

## Consequences

- A rejoined holder answers imgq for **every persisted blob it owns**,
  not only keys re-slimmed this session. The 2-peer reload starvation
  closes; `imgs` is the same keyspace `_imgSlim` writes, so keys line
  up by construction.
- The miss→stamp move bounds the IDB read rate at one lookup per key
  per 10s and `_imgqT` at 4096 entries. Side effect (accepted): an
  answer that only becomes possible *after* a miss now waits out the
  throttle window instead of firing on the next imgq — callers re-ask
  on every rescan cycle anyway.
- Seeding `_imgSent` from the local doc was rejected: it is also the
  dedup set for "already put on the wire", so seeding it would strip
  blobs from outgoing ops without transmitting them — parking refs on
  receivers that never get the bytes. Consulting IDB at answer time
  keeps the dedup invariant intact.
- A late answer staging into a switched room is harmless (bounded,
  self-cleaning), same tolerance the drain hook has.
