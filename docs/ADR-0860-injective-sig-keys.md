# ADR-0860 — sig keys over id sets must be injective (_JS encoding)

Status: accepted (v1.7.886)
Context: ADR-0683 (page sig separator), ADR-0680 (presence dedup key), ADR-0056 (drag-set snap exclusion)

## Defect

Shape ids are attacker-controllable: `validShape` only bounds them at `typeof string && ≤64 chars`
— the character set is unrestricted, so a remote peer can mint a shape whose id literally contains
',' (e.g. `id: "a,b"`). Three sites built dedup/index keys by `join(',')` over id sets, which is
non-injective: `{a,b}` and `{"a,b"}` produce the identical key `"a,b"`. Two colliding sets then
share a slot whose content only matches one of them:

| Site | Key | Wrong-reuse consequence |
|---|---|---|
| `resizeSnap` (ADR-0056) | `_selIds().sort().join(',')` | `_snapIndex` returns the OTHER set's exclusion index → the dragged set isn't excluded → self-snap onto your own selection edges |
| `moveDelta` drag start | `[...ptr.dragStartShapes.keys()].join(',')` | same stale-index reuse on the move path |
| `_syncStylePanelIfChanged` sig | `_selN()+'|'+_selIds().sort().join(',')` | signature unchanged across `{a,b}`→`{"a,b"}` → style panel keeps the OLD selection's values (visible wrong state) |
| `sendSelectionIfChanged` | `ids.join(',')+'|'+pg` | presence resend skipped → peers keep our stale selection highlight on their board |

Exploitability in the trust model is real: the id comes over the wire in `add`/`addMany`/snapshot
ops, a room peer needs no UI access to mint it.

## Fix — `_JS` (JSON.stringify) over the sorted id array

`JSON.stringify` is injective over arrays of arbitrary strings: it self-delimits (`"`), escapes
every separator candidate, and quotes each element — no element content can collide with the
container's structure. Replacing `join(',')` keeps a single string key (Map-slot compatible) while
making the key a faithful encoding of the set:

```
_selIds().sort().join(',')   →   _JS(_selIds().sort())     // resizeSnap, _selSig
[...keys()].join(',')        →   _JS([...keys()].sort())   // moveDelta (sort also drops insertion-order sensitivity)
ids.join(',')                →   _JS(ids.sort())            // presence dedup
```

Why not `\x1f` (the ADR-0683 precedent)? A literal `\x1f` separator is STILL injectable — ids may
contain `\x1f` too. JSON encoding is the honest fix for arbitrary character sets; `\x1f` remains
fine only where one operand is host-generated and sanitised (page ids are).

## Notes

- All four sites' key consumers only compare `===` (slot-cache key / last-sent marker / change
  signature) — an opaque string is all they need; nothing parses the key back.
- `ptr.dragStartShapes` order previously leaked into the key; sorting it makes the key order-
  independent, matching the resize/presence sites' already-sorted semantics.
- Cost: `JSON.stringify` on ≤ ~500 short ids per interaction frame — negligible.

## Tests (test.mjs, behavioural)

- `_snapIndex('resize','["a","b"]',exclAB)` vs `('resize','["a,b"]',exclOnly)` return distinct
  exclusion indexes (edge count differs).
- `Net.sendSelectionIfChanged`: `{a,b}` → `{"a,b"}` flips `_lastSelSent` (resend happens) and the
  key contains the JSON form `"a","b"`.
- Source pins at line 464 / 5183 updated to the new literals.
