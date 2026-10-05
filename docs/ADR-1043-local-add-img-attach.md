# ADR-1043: local adds attach ref-only images

## Status

Accepted (v1.8.069).

## Context

Every remote intake path funnels shapes through `Net._attachShape` — it
resolves an `img` ref against `_imgIn` immediately, or parks the ref in
`_imgPending` so the imgq re-request loop heals it when a peer holding
the blob answers (ADR-0835/0841, and ADR-1041 for the local import swaps,
ADR-1042 for the export side).

## Problem

`_placeCopies` (paste / ⌘D duplicate / Alt-drag / smart-dup chain)
clones the source verbatim — including `img:'k'` — and commits an
`addMany`. But the local `add`/`addMany` **forward** apply path pushed
`clone(shape)` directly: no `_attachShape`, so the copy's ref was never
parked under its new id. No park → no imgq re-request → the copy stayed
a blank placeholder forever even when a peer held the blob, while peers
receiving the same op healed it correctly (their `_attachOp` does run).
A strict local/remote asymmetry — the local author saw the one broken
copy.

## Change

Both forward push sites in `Store._apply` ride `Net._attachShape` like
every other path:

```js
_sh().push(Net._attachShape(clone(op.shape)));   // 'add'
_sh().push(Net._attachShape(clone(sh)));          // 'addMany'
```

Remote arrives already `_attachOp`-ed, so the double attach is a no-op
(`_imgIn` resolved → `dataUrl` present → `!_du` fails; parked → `_park`
rewrites the same entry). Copies with `dataUrl` likewise no-op; only a
ref-only copy changes — it parks under its new id and heals with the
same blob arrival that resolves the original.

## Verified

- Behavioural pins: a local `addMany` carrying `img:'k'` parks under the
  new id; a ref whose blob sits in `_imgIn` resolves to `dataUrl` on the
  same path; a `dataUrl`-carrying copy stays untouched (test.mjs).
