# ADR-1000 — Measure paths must set ctx.letterSpacing (draw/measure parity)

## Status
Accepted — fix implemented.

## Context
Canvas `ctx.letterSpacing` participates in `measureText().width` per the HTML
canvas spec. `drawShape` sets `c.letterSpacing=(_sp(s)||0)+'px'` per shape at
entry and resets it to `'0px'` at the end, so every wrapText/measure call
inside a draw measures at the shape's own spacing.

Two producer-side measure paths set `c.font` but never `c.letterSpacing`,
measuring at whatever the last drawn shape left behind (usually `'0px'`):

- `resizeAfterTextEdit(s,text,c)` — computes `s.w`/`s.h` on blur commit.
- `fitSticky()` — computes `nw`/`nh`, and wraps via `wrapTextCached`.

## Defect
For a sticky/text shape with `spacing>0`, both paths under-measure (the draw
adds tracking the measurement ignored): `fitSticky` under-fits height → text
clips the last line; `resizeAfterTextEdit` under-sizes `s.w`/`s.h` → text
visibly overflows the box the app just committed.

`fitSticky` additionally poisons `_wrapCache`: the entry is stored under a
key that correctly contains `_sp(s)`, but the `lines` were computed at the
stale spacing — every later `wrapTextCached` hit for the same shape renders
the wrong wrap until the key changes.

## Decision
Set `letterSpacing` from the shape being measured at both sites:

- `resizeAfterTextEdit`: `c.letterSpacing=(_sp(s)||0)+'px'` beside `c.font=`,
  then `c.letterSpacing='0px'` after measuring — the shared ctx is left at
  the drawShape baseline (this path does not save/restore).
- `fitSticky`: same assignment inside the existing `_sv2(ctx)`/`_rs2(ctx)`
  block — save/restore covers the reset.

## Audit — remaining measure call sites
- `wrapTextCached` calls inside `drawShape` (label/text/conn-label) — the
  ctx.letterSpacing is set per shape at entry; correct.
- SVG/drawio exporters use the `_ln(t)*fs*0.6` char-width approximation —
  no ctx measurement; unaffected.
- Readout pill / measure-tool overlay measure ephemeral labels at a fixed
  font — cosmetic only; left as-is.
- `resizeAfterTextEdit` font also lacked `letterSpacing` parity with the
  editor DOM (ADR-0873/0874 already kept the DOM editor aligned); now the
  canvas measure is aligned too.

## Consequences
- Sticky fit and post-edit resize honour `s.spacing`; no under-fit/clipping.
- `_wrapCache` entries are always computed at the spacing their key claims.
- Cost: +2 short lines; no behaviour change for `spacing=0` (the common case).

## Pins (test.mjs)
- `resizeAfterTextEdit` sets `letterSpacing` from `_sp(s)` and restores `'0px'`.
- `fitSticky` sets `ctx.letterSpacing` inside its save/restore block.
