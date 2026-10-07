# ADR-1110 — page birth clock (`bts`/`btp`) on page records

## Status

Implemented (v1.8.134, round860).

## Problem

Devin Review on ADR-1093 flagged two remaining page-tomb lifecycle gaps
(findings 2 and 4 of that review):

### Gap 2 — rep-less `_pgClk` fallback stamps the *receiver's* now-clock

`_pgClk(msg)` (ADR-1093) returns the snapshot's causal clock when present, but
its rep-less fallback is `{ts:nowTs(),peer:_pi(),seq:0}` — a *fresh* clock at
the receiver. Adopting a page set via `_pgAdopt(pages,cur,clk)` stamped
`_born` with that clock, so a tombed page resurrected through `msg.pages`
union-heal could outrank its *older* local tomb: a joiner that deleted `p2`
long ago would re-adopt it with `_born=now`, and the stale tomb `{ts:old}`
lost arbitration — zombie convergence broken.

### Gap 4 — `p.nts` is a rename clock, not a birth clock

The union-heal code stamped `_bT(p.id)` with the page's rename clock
(`nts`/`ntp`). A page renamed *before* deletion would carry a birth stamp
older than the tomb — wrong direction, and a page never renamed carried the
rep-less receiver clock instead (gap 2 again). Page records carried no
dedicated birth clock, so adoption had no honest value to arbitrate.

## Decision

Page records now carry `bts`/`btp` = the page's birth clock — the creator's
`op.clock` of the `pageAdd` that introduced the page — distinct from
`nts`/`ntp` (the *rename* clock) and structurally distinct from the
`bts`/`btp` fields on `pageName` *ops* (which carry the *previous* rename
clock, not a birth).

### Carriage (write side, zero emitter changes)

`pageAdd` forward stamps `bts:op.clock.ts,btp:op.clock.peer` on every record
it creates or promotes:

- page-less-doc record (`state.pages=[{…}]`),
- `'?'` stub promotion (`l.nts<0` → `l.bts/l.btp` set with `nts=0`),
- splice insert at `op.i`.

Undo-inverse `pageDel→pageAdd` rebirths naturally stamp the fresh undo clock —
correct semantics: the undo *is* a new introduction.

Because the record carries the clock, every existing emission channel carries
it with no wire/emitter changes: `pages:_pgs()` inside snapshots, `.board`
exports, `_slimOp` replace ops, and the IDB doc record.

`_vPages` accepts optional `bts` (`_tsOK` — finite, ≤ wall+5min) and `btp`
(string ≤64); either poisoned rejects the page set.

### Arbitration (read side)

- **`_pgAdopt(pages,cur,clk)`** builds a per-page birth clock
  `b = p.bts!=null ? {ts:p.bts,peer:p.btp,seq:0} : null` and drops adopted
  pages whose local tomb is newer than the carried birth — a page with **no**
  carried birth loses to any tomb (it cannot prove it was reintroduced after
  the kill). The receiver's clock no longer enters tomb arbitration.
- Kept pages still get `_bT` stamps — at the *carried* birth when present,
  falling back to `clk` (the snapshot/replace causal clock) only for
  birth-less pages. Records normalized with `bts`/`btp` so the next wire hop
  carries the real clock.
- **Union-heal** (snapshot `msg.pages` merge over an existing page set):
  new ids adopt only when the carried birth outranks the local tomb, and the
  `_bT` stamp is the carried birth — not `nts`. Same-id live records
  backfill missing `bts`/`btp` from the peer's record so a page introduced
  before this fix gains its clock on first contact with a new-format peer.
- **`_pgHealS`** no longer mints `'?'` stubs for `s.pg` values pointing at a
  tombed page (unless a newer `_born` exists) — the heal used to resurrect
  tomb-dead pages as permanent stubs.

### Backward compatibility

Old clients emit pages with no `bts`/`btp`: those pages adopt under the
previous `clk`-fallback semantics — they lose to tombs but still heal in
when no tomb exists, and they get `bts`/`btp` normalized on adopt so the
clock propagates on the next hop. Tomb machinery (`_wD`/`_bT`/`_bN`) is
unchanged; `dels` carriage is unchanged.

## Consequences

- Tomb-vs-birth arbitration on pages is now honest: carried birth vs local
  tomb, total order via `clockNewer` — symmetric with the shape-id
  tomb/born parity of ADR-0926/1093.
- The rep-less `_pgClk` fallback remains (it still feeds `_bT` for
  birth-less pages) but no longer participates in arbitration that would
  let it outrank a real tomb.
- `bts`/`btp` naming is structurally shared with `pageName` ops — ops carry
  rename clocks under those keys, records carry birth clocks. The two never
  meet (`op.clock` is the authoritative clock on every op).
- Raw cost: ~1KB net after a comment-tail reclaim; still under the
  557,056B raw ceiling.
