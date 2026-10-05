# ADR-1047: minimap image render verifies `_ik` like `getImg`

Date: 2026-10-01. Status: accepted (fix).

## Scope

`_imgCache` maps `_imgKey(dataUrl)` → decoded `Image`. The key is an O(1)
fingerprint (mime head + length + 48 chars each from head/mid/tail,
ADR-0035) — two different dataUrls *can* share it, so ADR-1040 made every
hit verify byte identity (`img._ik === dataUrl`) before serving the cached
bitmap.

## Finding

The minimap scene render (`Minimap`) was the only reader that bypassed
`getImg` and called `_imgCache.get(_imgKey(_du(s)))` directly — a pure
lookup with no byte-verify. A colliding pair rendered the **correct** image
on the canvas (getImg verifies) but the **wrong** bitmap in the minimap —
the same silent-misrender class ADR-1040 closed, left open on one consumer.

Crafting a collision is feasible for a wire peer: the fingerprint is three
deterministic byte ranges, not a hash — a hostile shape can carry a dataUrl
whose fingerprint matches another image's while the bytes differ.

## Fix

The minimap branch now requires `img._ik === _du(s)` before drawing; a
mismatch misses to the existing `#CBD5E1` placeholder (the correct
not-yet-decoded behaviour — the true owner recaches on next `getImg` call
per ADR-1040).

## Contract for new `_imgCache` readers

- Go through `getImg` (which verifies and recaches the true owner), or —
  for a non-mutating peek like the minimap — verify `img._ik === dataUrl`
  before using the bitmap. A raw `_imgCache.get(k)` hit is never sufficient
  authority to draw.

## Pin (test.mjs)

- Source pin: the minimap image branch contains the `_ik === _du(s)` check.
