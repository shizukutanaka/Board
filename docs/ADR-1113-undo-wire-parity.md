# ADR-1113: undo-wire × backward parity audit — every inverse op is wire-legal end to end

Status: accepted (audit complete — clean pass, contract pinned)

Date: 2026-10-01 (round863)

## Context

An ⌘Z is a *new competing write* (ADR-0717): `Store.undo()` restamps
`op.clock` to a fresh HLC clock `ut`, applies the op **backward** locally, and
broadcasts each op `_undoWire(op)` emits. Peers apply those wire ops
**forward**. Convergence therefore requires that for every op kind:

1. the emitted inverse passes `validRemotePayload` (it must survive intake on
   every peer), and
2. the peers' forward apply performs the same writes the undoer's backward
   apply performed.

Round863 audited all 17 op kinds across both requirements.

## Findings

### Every inverse is wire-legal — but not always pre-slim

For each op kind the `_undoWire` output goes through `Net.broadcast` →
`_slimOp` → `validRemotePayload` on the peer side:

| recorded op | inverse | wire-legality |
|---|---|---|
| add / addMany | `del` | valid as emitted |
| del / clear | `addMany` + `upd` per connClear | valid (wc rides, 0721/0726) |
| upd/style/resize/align/beautify | same-kind patch swap | valid (patches+cov) |
| move | `move` | **invalid pre-slim when the recorded op is delta-only**; `_slimOp` fabricates `after`/`before` absolutes from live shapes at send time (ADR-0729) → valid post-slim |
| group / ungroup | per-id/group inverse ops | valid (before covers all ids, 1087/1088) |
| zorder | `changes` swap | valid |
| replace | `{after:before, afterWc:wc, pages:beforePages, curPg:beforeCurPg}` | valid (0720); tomb parity applies on both sides (1112) |
| pageAdd | `pageDel` (`unpage`+shapes, or `firstId`) | valid (0775/0776) |
| pageDel | `pageAdd` + `addMany`(wc) + `upd` per connClear | valid |
| pageName | `pageName` with `bts/btp`→`nts/ntp` | valid (0727) |

The **delta-move seam** is the only case where a raw `_undoWire` op fails
`validRemotePayload` (the `move` case requires `patches(after)` + `patches(before)` + `cov`
since ADR-1086/1087). It is rescued because `Net.broadcast` always passes ops
through `_slimOp`, whose move branch fabricates absolutes from live positions:
`after = {x,y}` (post-undo position), `before = {x-dx, y-dy}` (pre-undo).
Peers therefore receive the undoer's post-undo positions as absolutes — their
forward apply lands the same coordinates our backward apply produced.

### The undo-side `_lwwSkip`/`_ccRest` gates are HLC-dead — by design

Backward apply gates key-by-key on `clockNewer(w[key], op.clock)` while the
peers' forward applies the wire op unconditionally. The asymmetry is resolved
by the HLC floor: `nowTs()` returns `max(Date.now(), _lastTs+1)`, and every
received op advances `_lastTs` to its `clock.ts`. Any stamp the undoer has
*seen* is therefore `< ut`, so the backward gates can never fire on
same-document ops — the undoer restores the same keys the peers write.

A genuinely racing write (peer clock running ahead, stamp `> ut`, unseen at
undo time) resolves identically on both sides at arrival by clock order — it
either wins everywhere or loses everywhere.

### Already covered elsewhere

- `_nugEnd()` inside `undo()`/`redo()` commits a pending held-key nudge before
  the history walk (ADR-0957), so no stale-`before` op is minted afterward.
- Replace backward keeps the same tomb parity as the peers' forward
  (old0/pg0 `_wD` + `_wTb`), closed in ADR-1112.
- `origSel`/selection restore is undoer-local — selection is per-client
  ephemeral state; no divergence.

## Decision

No code change required — pin the contract: every `_undoWire` op must be
`validRemotePayload`-legal **after `_slimOp`**, the delta-move rescue seam is
documented and pinned, and the HLC-floor invariant is pinned so a future
change to clock emission cannot silently re-activate the backward gates.

## Consequences

- The undo-wire × backward parity domain is closed: emit legality (this
  audit), clock restamp (0717), nudge ordering (0957), field parity (0720 /
  0721 / 0727 / 0719 / 0732), tomb parity (1112).
- A future `_undoWire` case emitting a wire-invalid op *that `_slimOp` cannot
  rescue* would reintroduce silent divergence — the pin suite fails loudly in
  that case.
