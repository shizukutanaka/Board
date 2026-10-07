# ADR-1135: undo-wire send exception tolerance

Status: Accepted (round885)
Date: 2026-10-01

## Context

ADR-1128–1134 closed a series of exception windows between "local apply" and
"peer propagation". Two windows remained open in `Store.undo`/`Store.redo`:

1. **`_pgFollow` ordering** — `undo()` and `redo()` called `_pgFollow(op)` (the
   ADR-0652 page-follow that lands the view on the touched page via
   `switchPage`) *before* broadcasting the wire ops. `switchPage` is a real
   throwing surface (editor folds, page-bar rebuild, persist scheduling), so a
   follow throw left the op applied locally but never propagated — a silent
   divergence.

2. **`undo()` mid-loop send failure** — the `_undoWire` loop broadcast each
   inverse op with a bare `Net.broadcast(w)`. A throw on any element aborted
   the loop, stranding the remaining wire ops (partial-send divergence).

## Decision

1. `_pgFollow(op)` moved *after* the propagation step in both `undo()` and
   `redo()`. The view-follow is a local-only effect; it must not sit on the
   propagation path. `state.histIdx` is still consumed first (ADR-1129), so a
   follow throw cannot double-revert — it can only skip the flush/repaint,
   which is benign (`_txFlush` entries are live-read no-ops when already
   emitted, ADR-1134; the next rAF frame repaints anyway).

2. The undo wire loop is now best-effort, matching the ADR-1130 `_txFlush`
   contract: each `Net.broadcast(w)` is wrapped; the first error is collected
   into `_werr` and rethrown after `_txFlush()` + `_rdb()` so the failure still
   surfaces to the caller.

`commit`/`_recordCommitted` keep their single bare broadcast: a throw there
has no "rest of the batch" to strand, and it surfaces directly.

## Consequences

- An undo that produces multiple wire ops (e.g. `del` + connClears restores,
  `ungroup` → group ops) now sends every op even when an early send fails.
- A `_pgFollow`/`switchPage` exception can no longer abort propagation in
  `undo`/`redo`.
- Pinned in test.mjs: all ops attempted despite a first-call throw (3 calls),
  remaining ops still broadcast (2 sent), first error rethrown after cleanup.

## Pins

- `try{Net.broadcast(w)}catch(e){if(!_werr)_werr=e}` — per-op send guard.
- `_pgFollow(op);   // ADR-0652/1135` after the wire ops in undo and after
  `Net.broadcast(op);` in redo.
- `if(_werr)throw _werr;` — best-effort drain + surface, same as ADR-1130.
