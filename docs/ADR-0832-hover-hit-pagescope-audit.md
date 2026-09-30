# ADR-0832: hover/hit page-scope audit complete

- Status: Accepted (2026-09-28, v1.7.858)

## Problem

Hover-derived state (`_ehov`, `state.hover`, `state.measure`) can
survive a page switch; any ungated consumer draws a phantom box on
the new page — the class 0831 fixed for the eraser hover.

## Fix

Audit conclusion (docs-only): the full sweep found exactly one
ungated consumer — `_ehov`, fixed by ADR-0831. Everything else is
already page-safe:

- `_qconnShape` gates `state.hover` with `_pgOk` internally, and
  `state.hover` feeds nothing else visual;
- `pickTop` + every snap-candidate loop check `_pgOk` on all paths;
- `state.measure` is cleared by `_zR` on every `switchPage`/
  `_pgAdopt` (gesture-state reset, 0664/0509);
- `_sqNav` step-through wraps within the rebuilt page-filtered
  match list — no OOB.

architecture.md's page-scope table gained a "hover/プレビュー残影"
row recording the rule: hover state must feed only `_pgOk`-gated
paths or be reset by `_zR`.
