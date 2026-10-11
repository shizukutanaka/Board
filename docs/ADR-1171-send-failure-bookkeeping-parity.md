# ADR-1171 — Send-failure bookkeeping parity: propagation sends strand nothing

## Status
Accepted (2026-10-01), fixed + pinned by 4 behavioural + 3 source asserts.

## Context

ADR-1135 gave `Store.undo`'s inverse-wire loop a best-effort send contract: a
`Net.broadcast` throw collects into `_werr`, `_pgFollow`/`_txFlush`/`_rdb` still
run, and the first error rethrows at the end. The audit question: do the other
propagation sends obey the same rule?

They did not:

- **`Store.redo`** sent `Net.broadcast(op)` unguarded *between* `_stampWrites`
  and the bookkeeping tail. A send throw would strand `_pgFollow` (page landing
  skipped), `_txFlush` (armed convergence queue left to drain late, out of
  order) and `_rdb` (repaint unscheduled) — after `histIdx++` had already
  consumed the op and `_apply` had mutated local state. Peers would never see
  the re-applied op: silent divergence.
- **`Store.commit`** sent `Net.broadcast(op)` unguarded one line before
  `_txFlush()`. A send throw stranded the convergence drain.
- **`Store._recordCommitted`** was already safe — its send is the last
  statement, so nothing can be stranded. `_txC` (ADR-1128) also sends last
  inside its try.

## Decision

Complete the ADR-1135 contract across propagation sites: **a send failure
never strands bookkeeping, and always still surfaces**.

- `commit`: `try{Net.broadcast(op)}catch(e){_txFlush();throw e}` — the
  convergence queue drains even when the send fails.
- `redo`: `let _werr=null;try{Net.broadcast(op)}catch(e){_werr=e}` then
  `_pgFollow`/`_txFlush`/`_rdb` run unconditionally and `throw _werr` rethows
  at the end — the undo wire loop's own idiom.
- `_recordCommitted` and the ad-hoc sends (pageDup addMany, text finalize,
  multi-page paste) are unchanged: their broadcast is already terminal, so a
  throw propagates with everything done.

The error still reaches the caller unchanged — this is ordering, not
swallowing.

## Pins

Behavioural (broadcast monkeypatched to throw):

1. `redo()` rethrows the send failure.
2. …but `histIdx` advanced AND `_pgFollow` landed (`curPg` moved to the
   pageAdd's page) — bookkeeping ran.
3. `commit()` rethrows.
4. …after the op applied and was recorded (`byId` + `histIdx` advanced).

Source:

- `try{Net.broadcast(op)}catch(e){_txFlush();throw e}` literal at commit.
- `try{Net.broadcast(op)}catch(e){_werr=e}` + `if(_werr)throw _werr` at redo.
- `_recordCommitted`'s broadcast follows `_rdb()` as the last statement.
