# ADR-0729: wire `move` carries absolute positions — delta×absolute races converge

## Status
Accepted (実装済)

## Context
Move deltas commute with each other (§3.16), but a move racing an
ABSOLUTE write (`upd{x:}`, `style`, `resize`) cannot: orig x=20,
A commits `upd{x:50}@ts1`, B commits `move{dx:+10}@ts2` —

- A: upd → 50, then move arrives (deltas applied unconditionally) → 60
- B: move → 30, then upd arrives (wins _lwwDrop if newer… or not) → 50 or 30

The peers' final x diverged by receipt order. Move was the only
position-writing op outside the LWW set.

## Decision
`_slimOp` stamps `after`/`before` position patches onto the wire `move`
(`{id,x,y}` per actually-moved shape; before = after − d). 'move' joins
`_lwwOp`, so `_lwwDrop` filters it against `wclock.x/y` per shape and
`_stampWrites` records the axes it changed (dx≠0 → x, dy≠0 → y —
matching the patch branch's `_chg` semantics). Receivers apply the
absolute positions; legacy peers ignore the new fields and keep applying
the delta (mixed-version divergence scoped as before — ADR-0613 rule).
Undo/redo move-wire gets the patches for free since _slimOp reads live
positions after the local apply.

## Consequences
- Move×upd races converge on the newer clock: the newer absolute write
  wins wholesale on every peer (10 vs 50 in the races above).
- Delta-form wire moves (no `after`) still apply as deltas — backward
  compat + the legacy-path test pins it.
- Two-peer behavioural tests cover both orderings + the legacy path.
