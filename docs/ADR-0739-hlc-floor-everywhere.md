# ADR-0739: every op clock rides the HLC floor

## Status
Accepted (2026-09-28)

## Context
`nowTs()` is the hybrid-logical-clock stamp: `_lastTs` ratchets up on every
*received* clock too (Store receive step, `state._lastTs=max(_lastTs,op.clock.ts)`),
so a stamp is always `≥` anything a peer has already shown us. Three sites stamped
clocks with raw `Date.now()` instead:

- the two `addMany` compat broadcasts (`shapes:sh`, `shapes:p.sh`) that re-send
  pageAdd member shapes for pre-0650 peers, and
- `_pgRename`'s pageName clock.

After any remote op carries a ts even slightly ahead of wall time (clock skew,
or simply a burst that ratcheted `_lastTs` mid-second), these raw stamps land
*below* the floor — the op orders under remote writes it actually followed in
real time. Convergence is preserved (all peers apply the same total order), but
the arbitration is unfair and non-obvious: e.g. a rename loses to an older
concurrent rename, or the compat addMany arbitrates as "ancient" in a tomb race.

## Decision
Stamp every op clock through `nowTs()`. One seam, one rule: a clock object
`{peer,seq,ts}` never carries wall-clock time, always the HLC floor. The one
surviving `_now()` on that path is the *read* fallback inside the pageName
applier (`op.clock.ts?_now()`) — defensive, never a stamp.

## Consequences
- Zero wire-format or semantic change for honest peers — stamps only move up.
- Guards: (a) no clock literal ends `ts:_now()}`; (b) `ts:nowTs()` appears at
  every stamp site (`_fck` + 3 direct sites).
