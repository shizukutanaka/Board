# ADR-0989: kind-coverage symmetry — `validOp` × `_apply` × `_undoWire` × `REMOTE_OPS`

- Status: Accepted, implemented (round738 — docs + pin)
- Date: 2026-10-01
- Round: 738

## Context

The op vocabulary must agree across four independent lists — a kind missing
from any one of them produces a silent divergence class:

| List | Role | Failure if a kind is missing |
|------|------|------------------------------|
| `validRemotePayload` (~1360) | wire intake validation per kind | forged ops of that kind reach `_apply` ungated |
| `Store._apply` (~1623) | forward/backward apply switch | valid remote ops hit `default:` and drop |
| `_undoWire` (~9830) | local undo → inverse wire ops | undo stays local-only — one-way divergence |
| `Store.REMOTE_OPS` (~1462) | wire op whitelist | (intentionally narrower: no 'clear') |

`Store._recordCommitted` broadcasts every committed op through `_slimOp` +
`Net.broadcast`, so kind coverage is the only divergence variable — the
transport never filters by op kind.

## Audit (all clean)

**Kind sets match.** `_apply`, `validRemotePayload`, and `_undoWire` each cover
the same 17 kinds: `add`, `addMany`, `del`, `clear`, `upd`, `move`, `zorder`,
`style`, `resize`, `align`, `beautify`, `group`, `ungroup`, `replace`,
`pageAdd`, `pageDel`, `pageName`. `REMOTE_OPS` carries 16 — `clear` is
deliberately absent (a forged remote clear must never wipe the board); a local
clear rides the wire as `replace{after:[]}` via `_slimOp` (ADR-0626).

**Undo-only fields never ride the wire.** `_slimOp` strips `origSel`, `moved`,
`orig` (ADR-0625/0965); `del`/`pageAdd` slim `wc`/`origSel` per-shape
(ADR-0445); `pageDel`/`pageName`/`replace` whitelist their wire fields
(ADR-0705/0720). `_apply`'s backward path reads `op.moved`/`op.before*` which
exist only on local history ops — a remote op carrying them is harmlessly
overwritten on forward apply (`if(forward)op.moved=[]`).

**Fields `_apply` reads that `validRemotePayload` does not validate are
value-gated downstream** — the only such fields are `pages`/`curPg`/
`beforePages`/`beforeCurPg` on 'replace'/'pageDel', all funnelled through
`_vPages`/`_pgById` inside `_pgAdopt` (forged values collapse to the legit
`pages:null` outcome — nothing worse than a valid sender can already do).

**`_undoWire` output ⊆ REMOTE_OPS ∩ validRemotePayload** — verified
behaviourally: each of the 17 kinds maps to ≥1 inverse op, and every emitted
inverse is in `REMOTE_OPS` and passes `validRemotePayload`. Notable emission
shapes: `group`→N `ungroup` ops (per former member), `ungroup`→`group` ops
regrouped by `before[].groupId`, `del`/`pageDel`→`addMany`+`upd`(connClears),
`clear`→`addMany`, `replace`→`replace` (re-broadcast pre-swap board, newest
`_lastRep` wins), `pageName`→`pageName` with the *restored* clock
(`nts:op.bts`), not the undo clock.

**Wire translation is total.** Every `_recordCommitted` op is slimmed and
broadcast — `broadcast(op)` has no kind filter; `_slimOp` handles every kind
(clear→replace translation, shapes slimming, or `...rest` passthrough). No
committed op kind can stay local-only on the send path.

## Pin

`test.mjs` (ADR-0989 block): all 17 vocabulary kinds × `_undoWire` —
asserts (a) each emits ≥1 inverse op, (b) each emitted op is in
`REMOTE_OPS`, (c) each emitted op passes `validRemotePayload`. 56 asserts.
This fails loudly if a future op kind is added to `_apply`/`validRemotePayload`
without a `_undoWire` case, or if an inverse starts emitting wire-illegal ops.

## Consequences

The four-list contract is documented and pinned: any new op kind must land in
all four lists simultaneously — a checklist enforced by test, not convention.
