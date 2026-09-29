# ADR-0719: move undo-wire sends the forward-moved set

## Status
Accepted (実装済)

## Context
A `move` op records two sets:

- `op.ids` — every selected id the gesture covered,
- `op.moved` — the ids the forward apply actually moved (ADR-0548: locked
  members are skipped, so moved ⊆ ids).

Local undo iterates `op.moved||op.ids` — correct. But `_undoWire` sent
`ids:op.ids`, so peers negated **every selected id**, including shapes that
were locked at commit and never moved.

## Divergence
Shape S selected but locked at commit (never moved, not in `op.moved`), then
unlocked before the undo:

- Local undo: iterates `op.moved` — S untouched.
- Peers receive `{op:'move',ids:[…,S]}` — forward apply skips only *currently*
  locked shapes — S is unlocked now → peers negate S by −dx.

Local keeps S in place, peers shift it — position divergence, undetected.

## Decision
The wire carries `ids:op.moved||op.ids` — peers negate exactly the set that
moved forward, and their own `sh.locked` gate still applies on top (a member
locked between forward and undo skips on both sides symmetrically).

## Consequences
- `op.moved` stays recorded on forward (ADR-0548) and now also rides the
  undo-wire set selection.
- Pin + behavioural test: locked-at-commit member unlocked since stays put on
  both sides; moved member converges back to origin.
