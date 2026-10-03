# ADR-0930: behavioural pins for the undo-wire × backward contract

## Status

Accepted (2026-10-01)

## Context

ADR-0929 verified by audit that all 14 op kinds converge under undo: the
undoer's backward apply and the receivers' forward apply of `_undoWire`'s
emitted ops produce identical post-state on every clock domain. This round
pins the three contract points most at risk of silent regression — because
they live in *different code paths* that could drift apart independently.

## Decision — pin the contract at the two-peer boundary

Three behavioural pins in `test.mjs`'s two-peer harness (A = undoer,
B = receiver):

1. **del-undo born parity** — a restored shape's `born` reverts to the
   recorded `B0` on **both** sides: del/pageDel backward stamps `_bT(U)`
   then merges `op.wc` via `_wR`, and the receivers' `addMany` forward uses
   the identical `_bT`-then-`_wR` order. Pins that a future reorder (e.g.
   `_wR` before `_bT`) would break — the round677 `replace`-backward bug was
   exactly this class.
2. **`_lwwSkip` ⇔ `_lwwDrop` parity** — a remote-peer prop write newer than
   the undo clock `U` is kept identically: the undoer's backward `_lwwSkip`
   deletes the key from the restore patch; the receiver's intake `_lwwDrop`
   drops the same key from `op.after`. Both sides keep the newest write.
3. **`_slimOp` field contract** — undo-domain fields (`wc`, `origSel`,
   `moved`, `before`-class aux) are stripped from wire ops, **but** the
   fields a receiver's forward apply needs are preserved: `wc` on `addMany`
   (member-clock merge), `connClears` on `del` (sender-computed unbinds),
   `nts`/`ntp` on `pageName` (restored-name LWW), `afterWc`/`pages`/`curPg`
   on `replace` (map adoption + landing).

## Consequences

- 9 asserts; a regression in any of the three contract points now fails a
  named pin instead of diverging silently.
- No index.html change (test-only round) beyond the version bump.
