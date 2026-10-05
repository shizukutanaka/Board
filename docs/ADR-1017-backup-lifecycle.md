# ADR-1017: `saveBackup`/`:prev` lifecycle coverage audit

## Status

Audit complete — structurally safe (behavioural pin added, v1.8.043).

## Context

`Persist.saveBackup` writes the pre-swap board to the single
`DOC_KEY+':prev'` slot so a wholesale overwrite is recoverable.
`checkBackup`+`confirm` at boot → `restoreBackup` (a reversible
`_repC` swap that also broadcasts) or `discardBackup`. Every path
that clobbers the whole board must save first — a miss loses the
user's work with no undo beyond history depth.

## Coverage table

| Overwrite path | `saveBackup` first? |
|---|---|
| local clear (6288) | yes — `if(_ln(before))` guards empty |
| `.board`/`excalidraw`/`drawio` import (6282, 7581, 8585) | yes |
| remote `'replace'` forward (1481) | yes — `_apply` gate before swap |
| remote `'clear'` forward | implicit — swaps to empty; local board is recovered through undo/history rather than `:prev` (clear is a normal op in history; `:prev` covers swap-class events). Covered by wire translation to `replace` anyway for new peers |
| `restoreBackup` itself | not needed — restores via `_repC` which IS the recorded undo |

## Notes

- Single slot: consecutive swaps keep the most recent pre-swap
  board — by design the freshest recoverable state wins.
- `checkBackup` prompts once per boot (`confirm`); restore runs a
  full `_repC` swap (reversible, propagates on wire) then discards.
- Blob GC (8684) keeps blobs referenced by EITHER the live doc or
  `:prev`, so a restored board's images are still in `DB_IMG_STORE`.
- Pin: `Net._onRecv` 'replace' with live board → `saveBackup` called
  exactly once before `_rs`.
