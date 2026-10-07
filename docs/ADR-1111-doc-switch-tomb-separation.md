# ADR-1111 — doc-switch tomb separation + sender-side adopted-page birth stamps

## Status

Implemented (v1.8.135, round861).

## Problem

The wclock doc-switch audit found two defects in the tomb-separation
boundary — the moment one document is swapped for another (`.board`
import, share-link import, backup restore):

### Defect A — sender never stamps `_born` on adopted `op.pages`

`Net._onRecv` 'replace' forward calls `_pgAdopt(op.pages,op.curPg,op.clock)`
which stamps `_bT` on every adopted page. The sender-side path —
`Store._recordCommitted`'s replace branch — stamped `_bT` only on
`op.after` shapes, never on `op.pages`. The sender therefore held no
`_born` for pages it had just adopted: tomb arbitration was asymmetric
(receiver `_born`-protected, sender tomb-vulnerable), and a later `del`
or stale tomb could kill the sender's adopted page while peers kept
theirs — page-set divergence.

### Defect B — `_pgAdopt` ran against the OLD document's tomb map

All three local doc-switch sites — `importBoard`, `importFromHash`, and
the backup-restore path — ran `_pgAdopt` BEFORE `state.wclock=_wM()`.
`_pgAdopt` internally calls `_pgHealS`, which reads `state.wclock` to
suppress `'?'`-stub creation for `s.pg` ids that are tomb-dead. With the
old doc's tombs still live, a new-doc shape carrying a pg id that
happened to be tomb-dead in the OLD document got no `'?'` stub — the
shape pointed at a page that will never exist → permanently invisible,
and the new doc's own tomb arbitration read a foreign kill history.
Tomb maps are per-document state and must not leak across a doc swap.

## Decision

### Sender parity (Defect A)

`_recordCommitted`'s replace branch now stamps `_bT` on every adopted
`op.pages` record — at the carried `bts`/`btp` birth clock when present
(the page's real birth, ADR-1110), else at `op.clock`, mirroring
`_pgAdopt`'s keep-side stamping exactly. `beforePages` drop-outs keep
their `_bN`-gated tomb (ADR-1109).

### Clean tomb slate before adopt (Defect B)

All three clk-less doc-switch sites now order the wipe before the
adopt: `_scl();state.wclock=_wM();` then `_pgAdopt(pages,curPg)`.
Selection hygiene (`_scl`) and the tomb-map reset stay paired; the new
document's page-set adoption and `s.pg` heal run against a clean slate
by design — tombs do not carry across doc boundaries.

Sites already passing `clk` (replace forward/backward, sync-req first
adopt, snapshot merge, IDB restore) are unchanged: they merge or adopt
within the SAME document's causal stream, where tombs must participate.

The `pageDel` backward restore site also carries `bts`/`btp` on the
restored record now (the undo clock — a new introduction), completing
wire-carriage parity for records minted outside `pageAdd` forward.

## Consequences

- Sender and receiver now hold symmetric `_born` coverage for adopted
  pages — a peer's stale tomb can no longer kill a page on exactly one
  side of the wire.
- `'?'`-stub heal for unknown `s.pg` works again after doc switches;
  new-doc arbitration reads only new-doc history.
- Behavioural pins (5 asserts) cover: sender carried-bts/op-clock
  stamping, `beforePages` tomb retention, `?`-stub heal on a clean
  slate, and the reset-before-adopt pairing at all 3 sites.
- The existing `importBoard clears selection+wclock` source pin was
  updated to pin the new ordering (reset *precedes* `_pgAdopt`).
- Raw: comment-tail reclaim kept the file under the 557,056B ceiling.
