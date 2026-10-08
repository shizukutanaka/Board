# ADR-1142: presence cursor coordinates share the intake magnitude bound

## Context

ADR-0792/0793/0795 bound every remote-supplied coordinate surface at intake —
shape geometry, pts/way arrays, and adopted viewport centers all go through
`_xyOK` (`finite && |v| <= 1e7`). The presence path was left with a weaker
check: `case 'cursor'` validated `x`/`y` for *finiteness only*
(`_iN(v) && _fin(v)`), so any finite magnitude — e.g. `1e30` — was stored and
rendered by `drawPeerCursors`.

## Defect

A malicious or buggy peer could park its cursor at an arbitrarily large world
coordinate. The draw cost is small (an off-screen arc + name label per frame),
but the surface was the **last unbounded remote coordinate** in the app: every
other remote x/y is clamped by `_xyOK` at intake, and the unbounded cursor was
a parity gap, not a designed exception. Two second-order effects made it worth
closing rather than pinning as-is:

1. `_w2(p.cursor)` on a huge coordinate can produce a screen-space transform
   with no useful interpretation — behaviour differs from every other
   remote-coord surface which is *rejected*, not silently clipped.
2. `sendCursor` writes `wp` derived from the clamped viewport — the send side
   can never produce an over-bound value, so accepting one on the wire accepts
   a value no conforming sender emits.

## Change

`case 'cursor'` now gates on `!_xyOK(msg.x) || !_xyOK(msg.y)` — the same helper
as shapes and viewports. `_xyOK` is strictly stronger than the old pair of
checks (it implies `_iN` and `_fin`), so the fix is smaller *and* tighter:
non-numbers, non-finite values, and |v| > 1e7 all break before the peer row is
touched.

## Contract

- Every remote coordinate lands inside `_xyOK`'s domain or is dropped — no
  finite-but-huge values reach `drawPeerCursors`, the peer row, or `_ivO`.
- `h:1` hides still work: `{x:0,y:0,h:1}` clears `p.cursor` (0 is in-bounds).
- No sender-side change needed — `sendCursor`'s world point is derived from
  the `_xC`-clamped viewport, already inside the bound.

## Verification

7 behavioural pins (test.mjs): source pin for the shared gate, reject at
1e9, accept at ±1e7 (exact bound), reject just over the bound on each axis,
and `cursorHide` still clears. 4341 total assertions pass.

## Second-order effects

None on legit clients: real cursor positions always stay well under 1e7
(viewport centers clamp at the same bound, and screen offsets are viewport-
scale). A peer that previously relied on seeing a cursor at a giant coordinate
now sees none — the intended outcome.
