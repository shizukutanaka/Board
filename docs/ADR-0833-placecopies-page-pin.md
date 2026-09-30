# ADR-0833: _placeCopies viewed-page pin

- Status: Accepted (2026-09-28, v1.7.859)

## Problem

`_placeCopies` (the shared duplicate/paste path, 0080) stamps
`sh.pg=state.curPg` so copies land on the viewed page (0646). The
rule was never pinned — a regression would make ⌘D/paste produce
invisible shapes on another page ("paste does nothing").

## Fix

Behavioural pin: on a two-page board, a copy of a page-A shape made
while viewing page B gets `pg==='pB'`; in single-page mode `pg`
stays unset. Complements the page-scope audit (0831–0832): mutation
paths place new geometry on the viewed page, never the source's.
