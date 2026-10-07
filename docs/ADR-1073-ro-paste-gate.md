# ADR-1073: read-only docs — shared gate in `_placeCopies` + `importBoardText` consumption

Status: implemented (v1.8.096, round822)

## Context

ADR-1057 introduced `state.ro` (view-only documents): every local-mutation funnel
(`Store.commit`, `_recordCommitted`, `undo`, `redo`, `_repC`) early-returns with the
`readOnlyMode` toast, and every gesture/editor/tool entry gate-checks it first.

`_placeCopies` — shared by paste (`doPaste`/`doPasteInPlace`/`doPasteAt`), smart
duplicate (⌘D), Alt-drag duplication, and `.board` clipboard merges via
`importBoardText` — had NO `ro` gate of its own. The `_cmt` funnel still blocked
the `addMany` commit (correct: nothing mutated), but the callers kept going:

1. **`state.dupIds`/`dupDelta` reseeded with dead ids** — a ro paste clobbered the
   user's live smart-duplicate chain with ids that never landed.
2. **Success toast on nothing** — `_tst('貼り付け N')` / `_o('imported N')` fired
   right after the `readOnlyMode` rejection toast, reporting a phantom success.
3. **`_textCascade` fall-through** — `importBoardText` returning falsy-ish on the
   blocked path could cascade to a plain-text shape attempt → a second `_roNo()`.

## Decision

Two small gates, placed at the shared seams rather than each caller:

```js
function _placeCopies(srcShapes,dx,dy){
  if(dx===_ud){…}
  if(state.ro){_roNo();return[]}   // gate precedes the dup-chain reseed
```

```js
function importBoardText(txt,wp){
  if(state.ro){_roNo();return true}   // consumed — no cascade fall-through
```

Callers suppress the success toast on an empty `added`:
`if(_ln(added))_tst(t(_PA)+' '+_ln(added));`

## Consequences

- One gate covers all four `_placeCopies` entry kinds and any future caller.
- Alt-drag (already `!state.ro`-gated at arming) is unaffected.
- On ro the user sees exactly one `readOnlyMode` toast; the dup chain survives.
- Rejected alternative: gating inside each paste caller — more bytes, and a new
  caller would silently lose the gate.

## Audit result

`Net.init` staged/reassembly queue reset (line ~8047) confirmed clean for
cross-room leakage: `_imgSent`/`_imgChunks`/`_imgOuts`/`_fragOuts`/`_snapIn`/`_opcIn`/
`_imgqT`/`_dcKey`/`_dcQ`/`_dcQB` all cleared on room switch.
