# ADR-1040: image-cache fingerprint hits verify byte identity

## Status

Accepted (v1.8.066).

## Context

`_imgCache` keys are `_imgKey` — an O(1) fingerprint: `prefix + length +
first48 + mid48 + last48` (ADR-0021/0035). Chosen for speed: hashing the
whole ≤16MB dataUrl per frame is too hot.

## Problem

A fingerprint is not content-addressed. Two different dataUrls sharing the
five sampled parts collide — `getImg(u2)` then returns the cached `Image`
for `u1` and the colliding shape silently draws the wrong pixels (canvas +
export path at `_dS` share the map).

## Change

On a fingerprint hit, verify byte identity before trusting the entry:

```js
let img=_imgCache.get(k);
if(img){_imgCache.delete(k);
  if(img._ik===dataUrl){_imgCache.set(k,img);return img}}
img=new Image(); img._ik=dataUrl; ...
```

- `img._ik` stores the inserting dataUrl; the `===` compare hits the
  reference-equality fast path for the common case (same `s.dataUrl`
  string object re-drawn each frame) → per-frame cost stays ~O(1).
- On a genuine mismatch the key is not evicted-to-NC; the slot is simply
  recached to the latest owner — the previous owner recaches on its next
  draw (thrash only while an actual collision exists, which is vanishingly
  rare). No unbounded poison set needed.

## Verified

- Crafted `data:`+`a`*494 pair differing at an unsampled offset → same
  `_imgKey`; `getImg` now returns a distinct `Image` per dataUrl and the
  slot holds `_ik===alt` after the miss (test.mjs, 7 pins).
