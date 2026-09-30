# ADR-0856: Dead-code, selection-repaint & error-path audits — complete

Date: 2026-09-30 (round605)

## Status

Accepted — no code change; three audit axes verified clean and recorded
as invariants.

## Context

After ~600 rounds the file is dominated by deliberate `_`-shorthand
declarations (a size mechanism: `const _iv=invalidate`, `_min=Math.min`)
and a dense mutation surface (selection, Store ops, imports). Three
class-wide questions had never been fully swept:

1. **Dead code** — are all shorthands/functions/members still referenced?
2. **Selection repaint** — does every `_ss`/`_scl`/`_sad`/`_sdl` site reach
   a repaint? (A missing one leaves a ghost selection outline.)
3. **Error paths** — can a `catch` fire after a partial mutation (board
   swapped but toast claims "invalid", or an unhandled rejection)?

## Findings

### 1. Dead-code sweep — clean

- ~236 `const _x=` shorthands and ~169 top-level `function _x()`
  declarations: every low-reference-count candidate was verified live
  (definition + real call site). Examples once suspicious: `_MSZ`
  (palette cap), `_TYPES` (shape-type Set), `_elbowLabelXY`,
  `_getFrames`, `_inkGrow`, `_pgNav`, `_renderScene`, `_segIntT`,
  `_snapIdx`, `_snapNear` — all called.
- Object members (`G`/`Store`/`Shape`/`Net`/`Persist`/`UI`): audited;
  no member without a `X.member` call site.
- The test api surface lives in test.mjs's `return{...}` literal —
  exposed-but-undestructured entries cost zero bytes in index.html.

### 2. Selection-repaint audit — clean

All 55 `_ss`/`_scl`/`_sad`/`_sdl` sites repaint:

- Store paths (`_apply` cases, `_rs`, `_pgAdopt`, `switchPage`) — the
  ADR-0855 funnel repaints.
- Interactive paths — explicit `_iv`/`_ivO` within a few lines (Tab
  cycle at 5914→`_iv`, ⌘A, marquee/lasso end via pointerup tail
  `state.marquee=null;_csr;_ivO`, paste/import via `_iv`).
- Editor paths — `openTextEditor` itself calls `_iv()` (`state.editing=`);
  the label Tab-chain repaints via its `commit()`.

### 3. Error-path audit — clean

59 `catch` sites reviewed; none leaves a partial mutation:

- `importBoard`'s `_IB` catch can only fire before the swap: everything
  post-`_rs` is either pure (`clone`, `_vPages` on JSON-shaped data) or
  internally caught (`_repC`→`Net.broadcast`→`_sendDC`/`bc.postMessage`
  self-catch).
- `Persist.saveBackup` (unawaited at import/adopt sites) wraps its whole
  body in `catch{}` — no unhandled rejection.
- `Persist.save` catch surfaces a real message via `_saveErrMsg`.

### 4. Severed-comment scan — none remain

The five-comment-fragment sweeps (ADR-0847/0849/0851/0854) are
exhausted: a mid-sentence-start scan now only matches the file's
legitimate lowercase section-label convention.

## Invariants for future edits

- New selection mutations must reach a repaint (usually via the commit
  funnel; gesture-local overlays use `_ivO`).
- New mutation code between `_rs` and `_repC` must not be able to throw
  (keep it pure or self-caught), or `importBoard`'s `_IB` toast becomes
  a lie: board swapped, reported invalid, and the undo op was never
  recorded.
- Removing a `_x` shorthand that still has ≥2 call sites *grows* the
  file — fold, don't delete.
