# ADR-1173 — intake page-homing

Status: Accepted — 2026-10-01
Prior art: ADR-0646 (multi-page), ADR-0833 (`_placeCopies` lands on the viewed page), ADR-1072 (foreign `pg` scrub on page-less paste)

## Context

`_pgOk` attributes a **pg-less** shape to the first page:

```js
const _pgOk=s=>!_pgOn()||(s.pg||_pgs()[0].id)===state.curPg
```

so any member arriving on a multi-page board *without* `s.pg` is silently
rendered on `pages[0]` — invisible to a viewer on any other page
(ADR-1072's exact failure shape, on the *missing*-pg side this time).

Local producers were patched one site at a time (`_smk` stamps
`base.pg=state.curPg`; `_placeCopies` stamped per-shape), but three
**single-page external-file intakes** still committed bare `addMany`
ops with no homing:

- `importDrawioText`'s single-page tail (`.drawio` with 1 `<diagram>`),
- `importSvgText` (`.svg` paste/drop/picker),
- `importExcText` (`.excalidraw` paste/drop/picker).

Reproduction: on a board with pages `p1,p2` and `curPg='p2'`, importing
any of the three file kinds commits the shapes *and shows the success
toast* — yet nothing appears on screen because the members attribute to
`p1`. Symmetrically, the pg-less branch left a **foreign** `s.pg` carried
by a crafted/imported payload in place, reviving the ADR-1072 phantom-page
vector.

## Decision

Extract the shared homing rule and apply it at every local intake seam:

```js
const _pgHome=a=>{for(const s of a){if(_pgs())s.pg=state.curPg;else delete s.pg}}
// home members on the viewed page — pg-less would attribute to pages[0]
```

- paged board → every imported member is stamped with the **viewed**
  page id (the only page the user can see), matching `_smk` and remote
  `pageAdd` member install (`c2.pg=op.id`).
- page-less board → any carried `pg` is **deleted**, so a payload can
  never smuggle a phantom page id (ADR-1072 closure, extended to the
  external-file intakes that bypassed `_placeCopies`).

`_placeCopies`'s identical inline stamp folds into the same helper at its
commit site (`{_pgHome(built);_cmt({op:'addMany',shapes:built})}`), so
paste/duplicate/.board import and all three file intakes share one rule:
**a locally introduced shape homes on the viewed page, or on none.**

## Consequences

- Multi-page boards now render drawio/svg/excalidraw imports on the page
  the user is looking at — previously invisible-with-success-toast.
- Foreign `pg` ids are scrubbed at every local intake, not just the
  clipboard funnel — one seam closes both the missing-pg and forged-pg
  vectors.

## Pins (test.mjs)

Behavioural (3):
- `importExcText` on a paged board (`curPg='p2'`): committed members carry
  `pg==='p2'` and pass `_pgOk`.
- `importExcText` on a page-less board: members carry no `pg`.
- Both commits return `true` (no silent rejection).

Source (3):
- `_pgHome` definition literal.
- `_pgHome(shapes)` applied at exactly the three external intakes.
- `_placeCopies` commit site ` {_pgHome(built);_cmt(…)} `.
