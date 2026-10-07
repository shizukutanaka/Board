# ADR-1121: Global op-log history boundary — audit complete

**Status:** accepted (docs + pins, no runtime change)
**Date:** 2026-10-01
**Scope:** `state.history`/`histIdx` push & replay surface — local commit, remote
apply, wholesale doc-switch ops, text-editor history surgery, undo/redo restamps.

## Question

Can the undo log diverge from the live board or from a peer's log — e.g. stale
ops from a previous document replaying into a swapped-in document, remote ops
leaking into local undo, or history surgery sites corrupting `histIdx`?

## Findings — all clean

1. **One global op log.** `_hi()=state.history`, `_hx()=state.histIdx`. Both the
   local `commit` (:1623) and the remote `applyRemote` (:1481) paths push the
   applied op onto the same array after chopping the redo branch
   (`_hi().length=_hx()+1`). Undo therefore means "undo the last *applied* op"
   regardless of author — a deliberate CRDT undo model where every undo is a new
   competing write (ADR-0717). There is no second list to diverge from.

2. **`state.history` is never reassigned.** No `state.history=` site exists;
   the array is only `push`ed/`shift`ed/spliced-in-place via `length=`. Session
   lifetime is bounded by `MAX_HISTORY=500`; the cap drops the *oldest* op and
   compensates `histIdx` (`else state.histIdx++`), so the cursor never walks off.

3. **Doc-switch ops ride the same log.** `.board` import, share-link import and
   `restoreBackup` all funnel through `_repC` → a `'replace'` op carrying
   `before`/`beforePages`/`wc`. Undoing past the swap replays `before` first —
   the log can never replay old-doc ops while the board still holds new-doc
   state, because the swap itself is the delimiter in the same array.

4. **Remote ops re-broadcast nothing.** Both push sites gate the outbound on
   `op.clock.peer===_pi()` — a peer's op is recorded locally but never echoed.
   Seen-op dedup (`_sO().add(k)`) precedes the push, so a re-delivered op cannot
   be pushed twice.

5. **Undo/redo restamps clocks.** `undo()` rewrites `op.clock` to
   `{peer:_pi(),seq:++state.seq,ts:_ut}` before applying — the stored op is
   mutated in place, so a redo later re-mints a *newer* clock (`_fck(op)`) and
   peers arbitrate on the fresh ts. Undo-wire inverses each mint their own seq
   (dedup distinctness). No path broadcasts a borrowed/stale clock.

6. **Text-editor history surgery is local-only.** `:5738-5744` mutates the
   just-pushed add op (`_hi()[_hx()].shape=clone(s)`) or truncates the tail
   (`_hi().length=_hx()+1`) after `Store.undo()`; peers never see history —
   they only see the ops `_syncTextFinalize` broadcasts. The stored `shape` is a
   deep `clone`, so later edits can't alias it (ADR-1120).

7. **`histIdx` cursors are session-local.** `histIdx` is not persisted, not on
   the wire, and starts at `-1`; every push either advances it or caps it.
   `undo()`/`redo()` guard with `_hx()<0` / `_hx()>=_hi().length-1`, and
   `ptr.down`/`_nugEnd`/`state.ro` gates run before the index moves — the cursor
   cannot go negative or past the tail.

## Contract pinned

- `const _hi=()=>state.history` + `const _hx()=>state.histIdx` — one shared log.
- `const MAX_HISTORY=500` — bounded, `shift` compensation keeps `histIdx` legal.
- Exactly the expected count of `_hi().length=_hx()+1` redo-chop sites (3:
  applyRemote, commit, text-finalize).
- `state.history=` never appears — the log is append/shift only.
- `if(op.clock.peer===_pi())Net.broadcast(op)` — outbound gate on both pushes.
- `histIdx:-1` initial; `op.clock={peer:_pi(),seq:++state.seq,ts:_ut}` undo
  restamp; `_fck(op)` redo restamp; `w.clock={peer:_pi(),…}` undo-wire mint.
