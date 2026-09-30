# ADR-0882 — SR announce covers dash/align/valign/text-flags

## Status
Accepted · v1.7.908

## Context
ADR-0414/0429/0380 progressively made `describeShape` announce the visual
state a sighted user sees at a glance: lock, hidden, group halo, bound
endpoints, rotation, flip, shadow, connector route, hatch, hop, link badge,
marker strokes. Left out were the **style-identity** props that change how a
shape reads: stroke dash, text horizontal alignment, sticky text vertical
alignment, and the four inline text flags (bold/italic/underline/strike). A
screen-reader user could set all of these (keyboard ⌘B/⌘I/⌘U/⌘⇧X, ctx menus)
but had no channel to ever read them back — the same class of
see-vs-hear asymmetry the earlier ADRs closed.

## Decision
`describeShape` appends, only when set:

- `s.dash` → `dashed` / `dotted` (the toolbar's own labels)
- `s.align` center/right → `ctxAlignCX` / `ctxAlignRight` (absent = the
  type's own default — label center, text left — silence)
- `s.valign` middle/bottom → `ctxAlignCY` / `ctxAlignBottom` ('top'/absent
  = default, silence)
- `s.bold`/`s.italic`/`s.under`/`s.strike` → new `tagBold`/`tagItalic`/
  `tagUnder`/`tagStrike` i18n keys, joined in one tag span.

Reuses existing menu/tooltip strings wherever they exist — the SR phrasing
matches what a sighted user reads on hover.

## Consequences
- ARIA announcement now covers every user-settable style prop with an
  i18n label; remaining unannounced props (raw colors, pixel sizes,
  letter-spacing/lineH numbers, corner radius) are magnitude values whose
  reading is a string of numbers — left out deliberately as low-signal.
- Funded by a refs-only comment compression (~1KB); net raw +? stays well
  under the 544KB ceiling.
- Behavioural pins exercise the real `describeShape` in both locales.
