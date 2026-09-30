# ADR-0830: eraser cascades frame members like Delete

- Status: Accepted (2026-09-28, v1.7.856)

## Problem

`eraseAt` collected only the hit shape — erasing a frame removed the
frame but left every member orphaned (unframed shapes sitting where
the frame was). Delete/doDeleteSel cascades members via
`withFrameChildren`; the eraser silently diverged in *behaviour*
(not state — both sides apply the same op, but the UX contract
"frame delete removes its contents" didn't hold for the eraser).

## Fix

`eraseAt` iterates `withFrameChildren([hit.id])`: each un-locked
member is spliced out for immediate feedback and pushed to
`_eraseBatch`. Locked members survive (Delete parity). `flushErase`
already restores+commits the whole batch, so connClears/undo cover
members unchanged. Behavioural pin added: frame+member erased
together, outside shape untouched, undo restores both.
