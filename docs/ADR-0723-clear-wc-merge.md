# ADR-0723: clear's undo merges op.wc, never replaces

## Status
Accepted (実装済)

## Context
`clear`'s backward used to run `state.wclock=clone(op.wc)` — a whole-map
overwrite. del's backward merges (`_wc()[id]=clone(w)` per deleted id).

## Divergence
Between a clear and its undo, new shapes may acquire write-clocks (a peer's
concurrent add+style — remote ops never enter local history, so the undo still
targets the clear). The whole-map overwrite wiped those *intervening* clocks
locally, while peers — whose undo-wire `addMany` only merges `wc` — kept them:

- Local: `wclock[T]` gone → later remote writes for T's props win stale clocks.
- Peers: `wclock[T]` kept → the same writes are correctly dropped.

Same op, different property values — silent divergence.

## Decision
Clear's backward merges `op.wc` per id — identical idiom to del's backward and
to the peer-side `addMany` `wc` application (ADR-0721). The 'replace' backward
at the next case keeps its whole-map replace: a swap-undo restores the pre-swap
world wholesale (post-swap shapes die on every side, so their clocks must die
too), and remote 'replace' does the same `clone(op.afterWc)` — already
symmetric.

## Consequences
- Clear-undo is arbitration-convergent: resurrected clocks restore, intervening
  clocks survive — identical maps on every peer.
- Two-peer pin: style→clear→remote-add+style→undo keeps both clock entries.
