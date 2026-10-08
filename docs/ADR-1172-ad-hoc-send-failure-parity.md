# ADR-1172 — ad-hoc send-failure parity

Status: Accepted — 2026-10-01
Prior art: ADR-1135 (undo inverse-wire best-effort sends), ADR-1171 (redo/commit bookkeeping parity)

## Context

ADR-1171 closed the last unguarded `Net.broadcast` sites *inside Store* — the two
remaining unguarded sends are the ad-hoc **companion `addMany` broadcasts** that
ride alongside a `pageAdd` commit (the `pageAdd` op already carries `shapes`; the
companion send keeps pre-0650 peers converged):

1. **`_pgDup`** — `Net.broadcast({op:'addMany'…})` followed by `switchPage(id)`.
   A send throw stranded the page switch: the duplicate page + members existed
   locally (committed via `_cmt`) but the view never followed.
2. **multi-page `.drawio` paste loop** — `Net.broadcast({op:'addMany'…})` inside
   `for(const p of per)`: a send throw on page *i* abandoned the *remaining*
   pages entirely (loop exits — pages `i+1..n` never even committed locally)
   plus every follower: `selId`/`selSh` tracking, `switchPage(selId)`, selection
   reseed, viewport restore, docName, `_iv()`, `_oT('dioImported')`. The worst
   outcome of the class: a half-imported document surfacing only as an uncaught
   exception.

The transport layer itself is fully guarded (`_send` wraps `postMessage` in
try/catch; `_sendDC` backpressure-queues and catches `dc.send`), so a
`broadcast` throw originates in the caller-visible envelope stage —
`_slimOp`, `_flushImgOuts`, `_mk`, `_mac`/`_dmac`, or a monkeypatched send —
exactly the failure surface the undo loop (ADR-1135) already tolerates.

## Decision

Same contract, applied to both sites: **best-effort send, bookkeeping first,
first error rethrown after**.

- `_pgDup`: `let _werr=null;try{Net.broadcast(…)}catch(e){_werr=e}` →
  `switchPage(id)` → `if(_werr)throw _werr`.
- paste loop: `_werr` collected per iteration (first error wins, later pages
  still commit + attempt their companion sends) → `switchPage`/`_scl`/`_sad`/
  viewport/docName/`_iv`/`_oT` all run → `if(_werr)throw _werr` before
  `return true`.

After this change every `Net.broadcast` site is either **terminal** in its
function (nothing follows to strand: `_recordCommitted`, `_syncTextFinalize`)
or **error-tolerant** (undo loop, redo, commit tail, `_txC`, `_pgDup`, the
paste loop). The send-failure contract class is closed.

## Consequences

- A mid-import companion-send failure can no longer silently truncate the
  document — all pages commit locally and peers see whatever subset of
  `pageAdd`s succeeded, which is a consistent (if incomplete) shared state
  rather than a divergent half-import.
- `_pgDup` always lands the user on the duplicate; the surfacing error
  reports the companion-send failure, not a lost page.

## Pins (test.mjs)

Behavioural (4):
- `_pgDup` with `Net.broadcast` throwing only on `addMany`: `switchPage` still
  lands `curPg` on the new page, and the send error rethrows.
- Success path unchanged: duplicate lands + no throw.

Source (3):
- `_pgDup` guarded literal (`{_werr=e}   // ADR-0650/0739/1172\n  switchPage(id);`).
- paste loop guarded literal (`{if(!_werr)_werr=e}   // ADR-1172`).
- Census: every `Net.broadcast(` site is inside a `try` or is terminal —
  `Net.broadcast(` occurrences minus `try{Net.broadcast(` occurrences equal
  the 2 terminal sites.
