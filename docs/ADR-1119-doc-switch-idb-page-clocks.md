# ADR-1119: doc-switch × IDB-migration page-clock coverage

- Status: accepted — audit complete (clean pass, contract pinned)
- Date: 2026-10-01
- Round: 869

## Context

ADR-1093/1110/1111 gave page ids the shape-tomb machinery (`_wD`/`_bT`/`_bN`)
and wired carried birth clocks (`bts`/`btp`) so a page tomb never kills a
born-newer page. That left one coverage question: the **local** doc-switch
paths — `.board` file import, `#b=` share-link import, and the `:prev` backup
restore — call `_pgAdopt` without a clock (`clk` is `undefined`), which skips
both the tomb filter and the `_bT` stamping inside `_pgAdopt`. If adopted
pages never received a `_born` stamp, a stale remote `pageDel` could splice
them — the exact class ADR-1094 closed on the wire paths.

This audit covered (a) every `_pgAdopt` call site and its clock argument,
(b) the IDB `v1 → v2` schema upgrade, and (c) the `'replace'` undo-wire page
set swap — plus a dead-code sweep and the op-enum four-face coverage
(`REMOTE_OPS` × `_apply` × `_undoWire` × `validRemotePayload`) as a side
check.

## Findings — clean

1. **Every clk-less `_pgAdopt` is followed by `_repC` →
   `_recordCommitted`.** The three local sites (`.board` import, share-link
   import, backup restore) each (1) precede the adopt with
   `state.wclock=_wM()` — a clean tomb slate that makes the clk-gated tomb
   filter vacuous — and (2) record a `'replace'` op. `_recordCommitted`
   stamps `_bT(p.id, p.bts!=null ? carried : op.clock)` for every adopted
   page (ADR-1111 sender parity), so local pages carry the same `_born`
   receivers derive via `_pgAdopt(…, op.clock)`.
2. **`Persist.load` passes `_pgClk(d)`** — the persisted `rep` marker when
   present, else the receiver clock — so reload-derived `_born` values match
   what wire peers stamped.
3. **`_undoWire('replace')` swaps the page sets** (`pages:op.beforePages,
   curPg:op.beforeCurPg`): the undoer's backward `_apply` reads
   `op.beforePages` while peers' forward apply reads `w.pages` — both land on
   the same pre-swap set.
4. **IDB upgrade is idempotent**: `onupgradeneeded` guards each store with
   `objectStoreNames.contains(…)`, so `v1 → v2` (which adds `imgs`) and a
   fresh install take the same path. All `load` field restores are
   individually gated (`validShape`, `_vPages`, `validClock`, `_tsOK`,
   `_vpOK`), so records written by older versions degrade field-by-field.
5. **Op-enum coverage is complete**: `REMOTE_OPS` (16 ops) ⊆ `_apply` cases
   (17, adding local-only `clear`) = `_undoWire` cases; `validRemotePayload`
   also validates `clear` (unreachable — defense in depth). Dead-code sweep
   found every helper/function referenced.
6. **`d.v` is write-only.** The persisted version marker is stored but never
   consulted; harmless — kept as a future-migration seam.

## Consequences

- The doc-switch page-clock surface is closed; no code change required.
- 8 source pins fix the contract: both store guards, the ≥3 `_wM()` slate
  sites preceding clk-less adopts, the sender `_bT` parity stamp, the
  `_pgClk(d)` hand-off, the undo-wire page swap, and the doc-record fields
  (`rs`, `wc`).
- Sender page objects keep `bts`/`btp` unwritten until the next `_pgAdopt`
  backfill (receivers backfill eagerly); persisted bytes can differ but the
  semantics converge on load — noted, not a defect.
