# ADR-0744: drop the unreachable legacy zorder apply path

## Status
Accepted (2026-09-28)

## Context
`_apply` 'zorder' kept a pre-Step2 else branch that applied a wholesale
`{before,after}` snapshot by rewriting `z`/`frac` unconditionally. After
ADR-0653 (locals commit `{changes}` only) and ADR-0742 (the wire
validator rejects every non-`changes` form) no code path can deliver a
legacy zorder op: `state.history` is session-only (the persisted doc
record never serialises ops), and `_undoWire`'s fallback emitted
`{after:op.before}` — a wire form every peer now rejects, i.e. a latent
divergence if it were ever reached.

## Decision
Delete the dead code:

- `_apply` 'zorder': remove the legacy snapshot else branch.
- `_undoWire` 'zorder': drop the `:op.before?[{after:op.before}]`
  fallback — the emitted op could never converge.
- `_lwwDrop`: the `!_iA(op.changes)` early-return stays as a defensive
  drop; comment updated.

## Consequences
- ~430B reclaimed; z-order has exactly one representation everywhere.
- The history invariant is now pinned: no legacy zorder apply path.
