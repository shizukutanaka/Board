# ADR-1054: merge-mode import

## Status
Accepted (round803, v1.8.077). Implements ADR-1048 candidate **P2-c**.

## Context
Two of the three `.board` ingest paths could only *replace* the board:

- `importBoard(file)` — unconditional atomic swap (`_rs` + `_pgAdopt` +
  `_repC` + `Persist.saveBackup`). No prompt at all.
- `Share.importFromHash()` — atomic swap gated by
  `confirm(t('importConfirm'))` (replace-or-abort only).
- `importBoardText` (clipboard `.board` paste) — already *merge*:
  parses `{shapes:[…]}` and lands them via `_placeCopies`.

The gap: to combine two boards (e.g. pull a shared board into your own
canvas) you had to lose your current content first, or juggle clipboard
export. The audit ranked this P2: real harm is the forced replace, not
any missing machinery — the additive path already exists and is
battle-tested by paste/duplicate.

## Decision
- `importBoard` and `importFromHash` get the same gate when the board is
  non-empty:

  1. `confirm(t('importMerge'))` → merge: `_mergeImport(shapes)` lands
     the payload on the current board and returns.
  2. Cancel → `confirm(t('importConfirm'))` → the old replace path
     (backup + swap). Cancel → abort.

  An empty board skips both prompts and swaps (merge ≡ replace there).
- `_mergeImport` is five lines over `_placeCopies(shapes,0,0)`: fresh
  ids (no collision on re-import), intra-import `a`/`b`/`groupId`
  remaps, `pg→curPg`, one undoable `addMany`, selection on the landed
  set, `imported` toast. A 0,0 delta preserves the imported board's own
  layout — a merge is not a paste, there is no cursor to anchor to.

## Why this shape
- **Reuse, not a third importer.** `_placeCopies` already solves the
  merge problem (id remap, bind remap, atomic undo, wire-converged
  `addMany`, img parking through `_attachShape` inside the apply).
  Duplicating it would fork the one place that must stay correct.
- **Merge needs no backup/undo-bar machinery** — it is additive and
  undoable like any paste, unlike the swap which is destructive and
  needs `:prev` + `_repC`. The two paths genuinely differ, so the gate
  asks rather than guessing.
- **Confirm pair, not a modal.** Matches the existing `importConfirm`
  idiom; zero new UI chrome, localized (`importMerge` in ja + en).
- **0,0 delta**, not center-on-viewport: merge preserves the source
  board's coordinates (paste-in-place semantics) so two boards
  authored against the same origin compose correctly.

## Consequences
- File import now prompts on non-empty boards where it previously
  replaced silently — same safety the hash path always had.
- Clipboard `.board` paste unchanged (was already merge via
  `importBoardText`).

## Contract pinned
- `confirm(t('importMerge'))` gates merge on both import paths
  (behavioural pin in test.mjs).
- `_mergeImport` re-ids the set, remaps intra-set binds, leaves
  out-of-set binds untouched (paste parity), is one undoable `addMany`.
