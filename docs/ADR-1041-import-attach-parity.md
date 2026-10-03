# ADR-1041: import swaps park image refs for imgq heal

## Status

Accepted (v1.8.067).

## Context

`_attachShape` resolves a shape's `img` ref against the received-blob
store (`_imgIn`) or parks it (`_imgPending`) so the imgq retry loop
re-requests the blob from peers. Every whole-board intake already rides
it: snapshot adopt, `Persist.load`, `restoreBackup`, remote 'replace'.

## Problem

The two file/hash import swaps did not: `importBoard` and
`importFromHash` set `state.shapes` via `_rs(...map(clone))` — a shape
carrying a parked `img:'k:N'` ref (e.g. exported while the blob was
mid-flight, or round-tripped between tabs) landed with a dead `img` prop:
never attached, never parked, never healed — a permanent placeholder that
persisted into future saves.

## Change

Both swaps now map through `Net._attachShape(clone(s))` — identical to
the `load()`/`restoreBackup()` pattern:

```js
_rs(shapes.map(s=>Net._attachShape(clone(s))));   // importBoard
_rs(valid.map(s=>Net._attachShape(clone(s))));    // importFromHash
```

A ref whose blob is already in `_imgIn` resolves immediately; otherwise
the shape parks and the 60s imgq re-request loop heals it whenever a peer
holding the blob is present; offline it expires harmlessly. Text/exc/svg/
drawio imports need nothing — they produce fresh shapes, never refs.

## Verified

- Source pins on both swap sites; behavioural pins: `_imgIn` hit resolves
  `dataUrl` at attach, unknown ref parks under its shape id (test.mjs).
