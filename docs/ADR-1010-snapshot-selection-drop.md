# ADR-1010: snapshot adopt must drop the old board's selection

## Status

Implemented (v1.8.036).

## Context

ADR-1009 swept wholesale-swap invalidation of *transient chrome*. The
sibling class is **selection state**: `state.selection` is an id set
resolved per frame via `byId`, so dead ids never *draw* — but they
linger as ghost members:

- status bar / SR announce counts phantom selected shapes,
- selection-scoped ops (delete/copy/style) build empty ops on dead ids,
- parity breaks: remote 'replace' `_apply` calls `_scl()`; local imports
  (`_rs` callers: importBoard, share-link, restoreBackup) call `_scl()`.

Audit of every wholesale-swap caller for the selection reset:

| Path | `_scl` | Verdict |
|---|---|---|
| `_apply` 'replace' forward | ✓ | parity anchor |
| `_apply` 'clear' forward | ✓ | |
| `importBoard` (.board/.excalidraw/.drawio) | ✓ | |
| share-link ingest | ✓ | |
| IDB restore / restoreBackup | ✓ | |
| `Net._applySnapshot` | ✗ | hole |

`Net._applySnapshot` (join adopt + sync-req response) called `_rs`
without dropping selection: a mid-session re-sync arriving while a
selection was active left ids of swapped-out shapes in `state.selection`
— `byId`-safe so no crash, but ghost membership persisted.

## Decision

`_scl()` inside `Net._applySnapshot` right after `_rs`. Full wipe (not
`_ss(_selIds())` survivor-preserving) for parity with 'replace': a
wholesale swap ends the prior board's selection semantics even for ids
that technically survive — they belong to the new generation.

## Consequences

- Contract: every wholesale-swap site resets transient chrome
  (ADR-1009) **and** selection; both live beside `_rs`/`_pcC`, never in
  callers' discretion.
- Behavioural pin: seeded selection + real `Net._applySnapshot` → 0
  selected.
