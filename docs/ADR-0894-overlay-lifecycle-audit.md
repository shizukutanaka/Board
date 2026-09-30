# ADR-0894: Edit-overlay lifecycle audit — complete

Status: Accepted (audit, v1.7.920)

## Context

After ADR-0892/0893 made the overlays follow shape and viewport
changes, this round verifies every open/close/reset path for the two
edit overlays (`_teTa` text editor, `_lblTa` label editor) — a missed
path leaves a ghost overlay or leaks a blur listener.

## Audit (all sites enumerated)

Open: `openTextEditor` → `_teTa=ta,_teVp=''`; `openLabelEditor` →
`_lblTa={inp,hit},_lblVp=''`. Both re-entries fold the previous
overlay first via `_cxO` (ADR-0560).

Close (graceful): blur → commit writes the value back through `_rcOp`
and nulls the slot; Escape discards by removing the blur listener
first; ⌘Enter chains the next sticky; Tab chains commit + reopen on
the next shape.

Close (forced): `_cxO()` blurs both overlays so their commit handlers
run — invoked on page adopt (ADR-0684), `switchPage` (ADR-0664),
double-open (ADR-0560), hide (ADR-0569), presentation entry
(ADR-0582).

Close (self-fold): `_teFollow`/`_lblFollow` remove the overlay and
null the slot when the live shape is gone / hidden / locked / off-page
(ADR-0559/0569/0572/0709) — covers remote del/hide/lock/pg
reassignment without waiting for blur.

Sig reset: window resize clears both signatures so the overlay
repositions on the next frame (ADR-0561); open resets to `''`.

Remaining `_teTa`/`_lblTa` references outside these sites: none.

## Decision

No defect found — the lifecycle is fully covered and every forced fold
routes through `_cxO` so commit semantics stay uniform. Recorded as an
audit-complete ADR; no code change beyond bookkeeping.
