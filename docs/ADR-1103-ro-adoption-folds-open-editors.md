# ADR-1103 — ro adoption folds open text/label editors

- Status: accepted (implemented)
- Date: 2026-10-01
- Version: 1.8.127

## Context

The ro (`state.ro`) mutation funnel stops every commit at `Store.commit` and
`_recordCommitted` (ADR-1057/1076). Doc-switch payloads can *adopt* `ro`
(`importBoard` swap, `importFromHash` share links, boot load, `restoreBackup` —
ADR-1069/1073). The text/label editor overlays commit their typed text only on
**blur** (`upd` op via `_cmt`).

`_teFollow`/`_lblFollow` run per frame and fold the overlay when the edited
shape is removed, hidden, locked, or leaves the viewed page
(ADR-0574/0709: "fold once instead of dangling until blur; no commit, so the
typed text can't be applied").

## Defect

`state.ro` was missing from both fold conditions. Sequence on an editable
board with a text or label editor open:

1. User opens a `.board` file / `#b=` share link / backup whose payload carries
   `ro:1` — `state.ro` flips true inside the swap (ADR-1069).
2. The overlay stays open: the fold checks `!s||_hd(s)||_lk(s)||!_pgOk(s)` —
   the edited shape still exists and is editable-looking.
3. User keeps typing, then blurs → the `upd` commit reaches `Store.commit`'s
   ro gate → `_roNo()` toast and silent rejection.
4. Typed text is discarded. The overlay also lingers visually over a now
   read-only canvas, advertising an affordance that cannot succeed.

Same defect class ADR-0572 (lock) and ADR-0709 (page-leave) closed: the commit
is guaranteed to be rejected, so the editor must fold before blur.

## Fix

`state.ro` added to both fold conditions:

- `_teFollow` (:5795): `!s||_hd(s)||_lk(s)||!_pgOk(s)||state.ro` → remove `_teTa`,
  clear `state.editing`, `_iv()`.
- `_lblFollow` (:4667): `!_lt||_hd(_lt)||_lk(_lt)||!_pgOk(_lt)||state.ro` → remove
  `_lblTa.inp`.

No commit fires on the fold (parity with the existing fold paths). Takes effect
on the next frame tick after `state.ro` flips — the same mechanism remote-kill
folds already rely on.

## Verified out of scope

- Editable → ro → editable re-adoption: overlay does not reopen (correct — the
  editor object is destroyed on fold, parity with all other fold paths).
- The blur-gate at `Store.commit` stays the last-resort funnel (ADR-1076); this
  is the UX-layer counterpart, not a mutation gate.
- Merge-import on an ro board (`_placeCopies` gate, ADR-1073) is unaffected.

## Links

- ADR-1057 (ro mode), ADR-1069 (ro adoption ordering), ADR-1073/1102 (ro gates),
  ADR-0574/0559/0569/0572/0709 (fold-on-removal precedents).
