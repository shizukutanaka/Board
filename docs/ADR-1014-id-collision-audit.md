# ADR-1014: id-collision × ingestion idempotence audit

## Status

Audit complete — structurally safe (behavioural pin added, v1.8.040).

## Context

Every ingestion surface can deliver a shape id that already exists
(legit replay, snapshot-op interleaving, duplicate pastes, cross-board
imports). A duplicate live object for the same id makes `byId`
first-hit divergent across peers and double-draws.

## Audit table

| Surface | Same-id arrival | Result |
|---|---|---|
| wire `'add'` (1624) | `!byId(wid)` gates the push | idempotent; `_bT` only merges the born stamp (0926); `_tmb` keeps the tomb winning |
| wire `'addMany'` / pageAdd members | same `!byId && !_tmb` filter per element | partial dedup — new ids add, held ids no-op |
| `'replace'` / `'clear'` undo re-add | `_sh().push` under backward + tomb gate (0734/0736) | restores only what the tomb allows |
| `_placeCopies` (paste/dup/import .board JSON) | `idMap` re-keys every shape + group + binding | source ids never leak; same file pastes N times cleanly |
| `importBoard` / share-hash / snapshot adopt | `_rs` wholesale swap | one atomic replacement, no coexistence |
| `excToShapes` / drawio / SVG import | `Shape.make` fresh `uid()` per element | source ids used only as a binding-resolution key map |
| local producers | `uid()` per `Shape.make` | no collision surface |

## Consequences

- Every point-ingestion is dedup'd on live membership + tombstone;
  every bulk-ingestion either re-keys ids or atomically swaps the set.
- Contract: a new ingestion surface must either remap ids (the
  `_placeCopies` idiom), filter on `!byId && !_tmb`, or swap wholesale.
- Behavioural pin: remote 'add' for a held id → `shapes.length`
  unchanged and live props unclobbered.
