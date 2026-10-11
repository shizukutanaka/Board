# ADR-1170 — Undo-domain purity: history is a local-only op log

## Status
Accepted (2026-10-01), pinned by 6 behavioural + 3 source asserts.

## Context

`state.history` feeds exactly two consumers: `Store.undo` (⌘Z) and `Store.redo`
(⌘⇧Z / ⌘Y). The audit question: can a remote peer's op ever become the undo
target — i.e., does Board run *collaborative* undo, or *local* undo?

## Decision

**Local-only.** `history` is a private op log, not the shared document timeline:

- The only producers are `Store.commit` (the local funnel at the top of
  `Store`) and `Store._recordCommitted` (the internal-commit funnel). Both run
  the same record tail: dedup add → apply-side bookkeeping → chop redo branch →
  `_hi().push(op)` → `state.histIdx++` → re-broadcast **only when
  `op.clock.peer===_pi()`** ("outbound only").
- `Store.applyRemote` applies, dedups, stamps prop clocks and flushes
  convergence — but contains **no history write** (no `_hi()`, no `histIdx`).
- Consequences that follow from local-only:
  - Every recorded op is self-authored (`clock.peer===_pi()`); `undo`/`redo`
    always replay a *local* `before` snapshot — never a receiver-reinterpreted
    remote patch.
  - Remote arrivals between local ops leave `histIdx` untouched: undo walks the
    last **local** op across the interleave, and a redo branch is never chopped
    by remote traffic.
  - Peer edits are still *reversible* — through the undo-wire protocol
    (ADR-0443+): a peer's own ⌘Z emits inverse ops which every peer applies
    like any remote op. Nobody can undo somebody else's work from their own
    keyboard.

This matches the long-standing doc claim (ADR-0723, research-improvements.md):
"remote ops never enter local history". It is now enforced by pins, because a
regression here (pushing remote ops for "auditability") would silently flip
⌘Z to global undo: any user could revert a peer's op, restamp and re-broadcast
it — precisely the divergence class the undo-wire stack exists to prevent.

## Pins

Behavioural (two-world harness, `applyRemote` for remote ops):

1. Remote `add` applies (`byId`) while `history.length`/`histIdx` are unchanged.
2. After mixed local+remote ops, `history.every(o=>o.clock.peer===peerId)`.
3. `undo()` across a remote `upd` interleave removes the last **local** `add`
   and leaves the remote shape untouched.
4. Remote `replace` never lands in history — the recorded tail stays the local
   `add`.
5. `redo()` still applies after remote ops arrived mid redo-branch.

Source:

- `html.split('_hi().push(op)').length-1===2` — exactly two record sites.
- `applyRemote`'s body contains no `_hi(`/`histIdx` write.
- `if(op.clock.peer===_pi())Net.broadcast(op)` appears at exactly the two
  record tails — a foreign-clock op that somehow entered a funnel could never
  echo back out.
