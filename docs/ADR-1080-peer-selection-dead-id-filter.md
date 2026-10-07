# ADR-1080 — peer-selection ids resolve against live shapes

- Status: implemented (v1.8.104, round830)

## Context

`case 'selection'` stored up to `MAX_OP_SHAPES` (200,000) ids per peer:

```js
const ids=_s0(msg.ids,MAX_OP_SHAPES).filter(_idOK);
p.sel=ids;
```

`_idOK` validates only the *format* (string, ≤64 chars) — not existence. A peer
can send 200K well-formed-but-nonexistent ids once; `p.sel` then stores ~12MB of
dead strings per peer, and `drawPeerSelections` iterates every entry through
`byId` on **every overlay repaint** (`_ivO` fires on any presence/pointer
activity): up to 200K Map lookups × peers per frame — a persistent CPU amplifier
that survives until the peer's next `selection` message or disconnect.

## Decision

```js
p.sel=_s0(ids.filter(byId),4096);
```

- **Existence filter at intake** (`ids.filter(byId)`): dead ids are never
  stored, so the stored list can only contain shapes that resolve — the draw
  loop's `!s` guard becomes a pure safety net, and storage shrinks to the
  intersection of the wire list and the live board. Cost is one O(ids) pass of
  O(1) Map lookups per message — strictly less work than the JSON parse that
  already produced the array.
- **4096 display cap**: after filtering, a genuinely-huge live selection still
  iterates 200K outlines per repaint. Selection highlight is presence chrome —
  capping it degrades cosmetics (a peer's >4096-shape selection under-draws)
  without touching correctness.
- **Ordering race accepted**: a peer can select a shape whose `add` op is still
  in flight; the filtered entry is dropped until the peer's *next* selection
  update heals it. Presence is latest-wins and resent on every change — the
  window is one message wide and the artifact is a missing dashed outline.
- `_nIn` names bounded ≤24 at the same seam (verified, ADR-1053); `cursor` x/y
  finite-gated; `pg` sliced ≤64 — presence intake otherwise clean.

## Behavioural pins (test.mjs)

- `selection` of 3 dead ids stores `p.sel=[]`.
- `selection` of `['live1','dead9']` stores exactly `['live1']`.
- Source pin: `p.sel=_s0(ids.filter(byId),4096)`.

## Consequences

Dead-id peer selections can no longer wedge overlay repaints: storage drops to
live ids only (≤4096), and every stored id draws at most one outline.
