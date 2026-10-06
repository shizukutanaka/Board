# ADR-1069 — doc-switch imports adopt `ro` before the swap's `_repC`

**Status:** implemented (v1.8.092)
**Related:** ADR-1057 (read-only share links), ADR-0004 (self-overwrite
protection), ADR-0009 (`_rs` wholesale swap), ADR-0613 (`replace` op)

## Context — the invariant

`state.ro` (ADR-1057) gates every *mutation op*: `commit`,
`_recordCommitted`, `undo`/`redo`, and `_repC` all drop under it. A
doc-switch import (`importFromHash`, `importBoard`, `restoreBackup`) is
different in kind — it doesn't mutate *this* document, it loads a
*different* one — and each payload carries its own `ro` flag saying
which context the receiver should land in (ro:1 share links carry it;
the IDB doc record persists it).

But the ordering was broken:

- `importFromHash` set `state.ro=data.ro===1` **after** `_repC` —
  the swap's replace op was judged under the *stale* context.
- `importBoard` and `restoreBackup` never settled `state.ro` at all —
  always judged under whatever context the previous doc had.

## The concrete failure

On an `ro` session, opening an **editable** doc (a non-ro share link or
a `.board` file):

1. `_rs` swapped the local board — a doc switch is always allowed
   (it's a load, not a mutation).
2. `_repC` ran while `state.ro` was still `true` → dropped → no history
   entry, no broadcast.
3. `state.ro` then flipped editable (`importFromHash`) or stayed `true`
   forever (`importBoard`/`restoreBackup`).

Net effect: the new doc existed only locally — **no undo for the swap,
no op reaching the room, silent divergence from every peer**, and an
`importBoard` user stayed read-only on a document they owned.

The mirror case (editable session → `ro:1` link) had the opposite leak:
the replace recorded and **broadcast** — an about-to-be-read-only viewer
pushed a whole-board swap onto the room.

## Decision — adopt before record

Each doc-switch settles `state.ro` from its payload **before** `_repC`:

```
_rs(swap); …adopt doc fields…; state.ro=d.ro===1; _roBadge(); _repC(...)
```

- ro → editable import: adopted context is editable → the replace
  records, enters history (undoable), and broadcasts (converges).
- editable → ro import: adopted context is ro → the replace drops —
  a read-only viewer never pushes a mutation to the room (this is what
  `ro` exists to prevent).
- ro → ro import: unchanged (swap is a private doc view).

## Payload parity

`ro` is a *view context* the payload carries, so every doc payload now
includes it:

| payload | ro field |
|---|---|
| share link (`exportToUrl`) | `data.ro=1` when ro — already had it |
| IDB doc record (`Persist.save`) | `ro:state.ro?1:0` — already had it |
| `.board` file (`exportBoard`) | **new** — `ro:state.ro?1:0` |
| `:prev` backup (`saveBackup`) | **new** — `ro:state.ro?1:0` |

`copyBoardJSON` is intentionally excluded: it's a *merge* payload pasted
into the current doc (a mutation, ro-gated via `commit`), not a doc
switch.

Absent `ro` defaults to editable — old `.board` files and pre-ADR-1069
backups behave exactly as they did for editable sessions.

`Persist.load` needed no reorder (it has no `_repC`).

## Contract (what a new doc-switch must do)

1. Swap the local board (`_rs` — doc loads are never gated).
2. Adopt `state.ro` from the payload BEFORE `_repC`.
3. If the payload format is ours, write `ro` into it at export time.
