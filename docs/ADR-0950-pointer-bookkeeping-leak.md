# ADR-0950: Pointer bookkeeping — ghost entries must never form a phantom pinch

## Status
Accepted (2026-10-01)

## Context
`_pointers` (pointerId → {x,y}) feeds the pinch branch in the `_PM`
capture listener: once two entries exist, moves compute a distance ratio
and call `zoomAt`. Entries were created on every canvas `_PD` **and** on
any `_PM` while `_nP()<2` — including pure hover moves (`buttons===0`) —
but were deleted only on **canvas** `_PU`/`_PC`.

Two leak paths left stale entries:

1. **Off-canvas release.** An uncaptured pointer (non-primary buttons —
   stylus barrel / X1-X2 — or a pointer whose `setPointerCapture` throw
   is swallowed per ADR-0906) released outside the canvas never fires a
   canvas `pointerup`; its entry persists forever.
2. **Hover seeding.** A mouse hovering the canvas records an entry with
   no gesture at all. It lives until a `pointerleave` — which never
   removed it — or forever.

In both cases the stale id pairs with the next real pointer: the pinch
branch sees `_nP()>=2`, seeds `_pinchPrev` from the stale→live distance,
and subsequent moves diverge the ratio → **phantom `zoomAt`** — the view
zooms under a single finger. `_resetPinch` shared the same hole: bound
only to canvas `_PU`/`_PC`, so `_pinchPrev` could survive into the next
pair and produce a one-shot zoom jump.

## Decision — window-level release handling + no hover seeding

- `_pointers.delete` and `_resetPinch` moved from `canvas` to `window`
  `_PU`/`_PC` (capture phase). A window-level release sees every pointer
  regardless of capture/target, and both handlers are idempotent — a
  normal captured release hits them on the bubble path too.
- `_PM` now seeds an entry only when `e.buttons!==0`: a move with no
  button down is never a pinch candidate. (`buttons===0`, not falsy —
  synthetic/test events without the field keep the old record semantics.)

Invariants now pinned:

1. a `buttons===0` move creates no tracking entry;
2. a `window`-level `pointerup` clears the entry even when no canvas
   event ever arrives;
3. a genuine two-pointer move still pinch-zooms.

## Consequences
Phantom pinch-zoom under a single pointer is impossible from either leak
path. `test.mjs` `fire` now dispatches window listeners in real DOM
order (window capture → canvas capture → canvas bubble → window bubble),
which also un-stranded the bookkeeping in every existing sequence pin.
3040 → 3043 asserts.
