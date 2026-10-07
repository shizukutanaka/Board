# ADR-1086 — remote `move` requires the `before` baseline

**Status**: accepted · **round**: 836 · **version**: 1.8.110
**Supersedes**: the `before == null`-allowed tail of ADR-0729/0741 (documented as
optional in ADR-1085).

## Context

ADR-1085 established that wire `before` patch arrays are not undo-domain data —
they are the **receiver-side changed-props baseline**. On a `move`, the receiver
diffs `before` → `after` to identify which properties the sender actually
touched, and only those properties get an LWW stamp (`_chg`/`_stampWrites` at
index.html:1609-1611 route patch-form moves through the same `stamp(p.id, p,
bb[p.id])` merge as every other patch op).

The validator nevertheless kept the tail `(op.before == null ||
patches(op.before))` — a `move` with absolute `after` positions but no `before`
was still admitted.

## The hole

A `move` with `after` but no `before` produces `bb[p.id] === undefined`; the
merge treats **every** property in `after` as changed and stamps it. Positions
are always two-axis (`x` and `y` both ride `after`), so a before-less move
**stamps both axes unconditionally** — exactly the divergence the baseline
exists to prevent: a forged (or legacy/stale-SW) move touching only `dx` stomps
a peer's concurrent `dy`-only move, and neither side ever heals.

## Decision

`validRemotePayload` `'move'` now requires `patches(op.before)` — same contract
as `style` / `resize` / `align` / `beautify`, which already reject missing
`before`.

Compatibility: every current emit path already sends `before` (ADR-0729 made
wire moves absolute; `_slimOp` keeps both patch arrays; undo-wire move carries
`before`/`after` since ADR-0719/0732). Only forged ops and pre-0741 legacy
producers lose the door — and pre-0741 producers' moves were already rejected
for lacking absolute `after`, so no reachable contract changes.

## Consequences

- Wire intake `move`: `patches(op.after) && patches(op.before)` — both required.
- Local (`Store.commit`) delta moves are unaffected — the validator only gates
  remote intake.
- Test fixtures migrated: v1.7.48c, ADR-0741, ADR-0969, `_nugLock`, and the
  ADR-1085 pin's move line now send `before` — matching what real peers emit.
- Behavioural pins (test.mjs): before-less / `before:null` / non-array `before`
  rejected; emitted move records the pre-move baseline; concurrent
  disjoint-axis moves converge (`x` = ours ∧ `y` = theirs) through the
  before→after diff.
