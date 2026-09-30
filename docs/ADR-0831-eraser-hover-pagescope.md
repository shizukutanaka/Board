# ADR-0831: eraser hover target gated to the viewed page

- Status: Accepted (2026-09-28, v1.7.857)

## Problem

`state._ehov` records the shape under the eraser cursor for the red
dashed hover box (0177). It survives page switches: hovering a shape
on page 1 then jumping to page 2 left `_ehov` pointing at an
off-page shape, whose box was drawn at its world rect on the wrong
page — a phantom erase target.

## Fix

`drawOverlay` gates the resolved shape with `_pgOk`: an off-page
hover renders nothing. The stale id itself is overwritten on the
next real hover (4342) and cleared on tool change (6108), so no
state scrub needed — ~110B for the draw gate only.
