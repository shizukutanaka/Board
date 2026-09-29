# ADR-0794: Sync architecture.md to the ADR-0788–0793 intake-bounds cluster

- Status: Accepted (docs only, 2026-09-28, v1.7.820)

## Background

ADR-0787 synced the wire-bounds section through 0786. Six more intake-bounds
changes landed since — 0788/0789 (wclock null-proto + write-site fold), 0790
(dup-id dedupe), 0791 (`_tsOK` future-ts bound), 0792 (`_xyOK` coord bound),
0793 (bbox-feeding prop bounds) — without a matching doc update, leaving the
hardening contract out of the architecture reference.

## Decision

Two bullets appended to the wire-validation section of architecture.md:

1. **wclock null-proto** — why `_wM`/`_wD`/`_wR`/`_wTb` exist (the
   `__proto__` wire key that froze every add), plus the 0790 dup-id
   keep-last rule.
2. **Bounded LWW clocks and geometry** — `_tsOK` wall+5min (self-stabilizing
   since `nowTs` ratchets on remote ts), `_xyOK` |coord|≤1e7, and the
   non-coordinate geometry props (`size≤1e4`, `bend` as a world coord,
   `aF/bF∈[0,1]`) so the full bboxAll-poison surface is closed.

No code changes. v bump + CHANGELOG line keep the release ledger honest.
