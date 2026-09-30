# ADR-0899: Input-path audit — complete

Status: Accepted (docs, v1.7.925)

## Context

Rounds 645–648 walked the remaining canvas input surface after the
button-gate fixes (ADR-0896/0897/0898). This records the audit result.

## Scope audited

- **dblclick → label/text editor** (4519+): `_pA()` gate first (presentation),
  empty→`beginText`, group-descend, locked guard, `_txt/_stk→openTextEditor`
  else `_openLabelEditorFor`; `openLabelEditor` runs `_cxO()` first so a
  second editor can't clobber `state.editing` (ADR-0560), `inp.maxLength=80`
  matches the wire bound, commit is an `upd` op with the remote-del `byId`
  guard (ADR-0556), blur/Enter commit, Tab chain is page-scoped (`_pgOk`),
  Escape discards. `_lblFollow`/`_teFollow` sigs carry `v.zoom`+`_gridVer`
  (ADR-0892/0893) and fold on gone/hidden/locked/off-page (ADR-0559/0569/
  0572/0709).
- **Gesture end-of-life** (`_ptrReset` ADR-0764, `abortGesture`,
  `_cancelPointerGesture` ADR-0574): every arm-flag cleared in one place;
  `_geoR` restores geometry only (orig sets never leak style props);
  `_eraseBatch` is pushed back before reset on all three cancel sites.
- **Eraser flush** (`flushErase`): restores batch → `_sz/_iG` → connClears
  resolved against the *removed* set → single `del` op → selection kept.
  Matches Delete parity (ADR-0830).
- **Measure/eraser hover** (`state.measure`, `state._ehov`): sig-compare
  writes only on change; Alt keyup + pointerleave clear; eraser hover is
  page-scoped (ADR-0831).
- **pointercancel / lostpointercapture / contextmenu / pointerleave /
  blur / hidden / pagehide**: all funnel into `_cancelPointerGesture` +
  `_clearTouchState` (pointers/pinch/minimap nav) + `sendCursorHide`
  (ADR-0604/0608/0611/0632/0636).
- **Click-click line mode** (`ptr.lineClick`): ADR-0126 pick-point state is
  cleared on commit, tool switch, and `_ptrReset`.

## Result

No defects. Every pointer/keyboard surface either terminates into a shared
reset chokepoint or is sig-gated to no-op. `e.button>1` now covers both
arm-sites (canvas + minimap); `dblclick` needs no button guard (UI Events
fires it only for the primary button).
