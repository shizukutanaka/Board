# ADR-1094 — page tomb loses to a newer `_born` (del parity)

## Status

Implemented (v1.8.118, round844).

## Problem

ADR-0926 gave shape `del` an existence-clock gate: a kill op loses to a newer
`_born` (`if(byId(sh.id)?.locked||_bN(sh.id,op.clock))continue;`). ADR-1093 put
page ids on the same tomb machinery — `_wD` writes the tomb, `_bT` stamps the
birth — but the page-id **kill paths never consulted `_bN`**:

1. `pageDel` forward spliced `state.pages[i]` unconditionally once `i>=0`. A
   stale `pageDel` (re-delivered after `seenOps` eviction, or causally-older
   than a rebirth) could remove a page that had been *reborn* — via
   `pageDel`-undo (which `_bT`s the page at the fresh undo clock), a
   union-heal born-stamp, or a re-`pageAdd`. Worse, `_pgDel2` then wrote
   `_wD(op.id,op.clock)` — **clobbering the newer `_born` entry** (the wclock
   entry is a whole-value replace), so even a later `dels` exchange saw a
   stale tomb that outranked the real birth.

2. `replace` forward tombs each dropped page id (`pg0` minus `op.pages`).
   Same hole: a dropped-but-reborn page id got a fresh `_del` that could
   outrank its `_born`, making the tomb shadow the live page on the next
   `dels` round-trip.

## Decision — the same `_bN` gate shape `del` already had

1. **`pageDel` forward** — `if(_bN(op.id,op.clock))break;` after the `i<0`
   guard. A newer-born page survives a stale kill entirely (no splice, no
   member kill, no tomb write). `_pgDel2`/`pageDel` do **not** wipe `wclock`,
   so a live `_bN` read is correct here.

2. **`_pgDel2`** — `if(!_bN(op.id,op.clock))_wD(op.id,op.clock);` — the tomb
   write itself is gated, covering every `pageDel` caller (forward, dels
   intake, `pageAdd` backward where `_bT` used the same clock → born ties →
   tomb still writes).

3. **`replace` forward** — the dropped-page tomb loop gates on
   `wc0[p.id]._born` — the **pre-wipe** snapshot, never `_bN`: `replace` sets
   `state.wclock=_wM()` before the loop runs, so a live read would see an
   empty map (dead code). Same pattern the shape-side loop already uses.

## Consequences

- Del parity is complete: kill ops lose to newer births on **both** key spaces
  (shape ids since ADR-0926, page ids since this ADR).
- A stale `pageDel` is now a no-op against a reborn page — no splice, no
  member kill, and no tomb clobber of the `_born` entry.
- A `replace` that drops a page id still tombs it, unless the pre-swap clock
  says the id was born after the replace's clock.

## Tests

test.mjs `ADR-1094` block (6 asserts): stale `pageDel` cannot splice a
newer-born page, cannot kill its members, writes no tomb and keeps `_born`;
a fresh `pageDel` still tombs; stale `replace` writes no tomb over `_born`
(pre-wipe `wc0` read); fresh `replace` still tombs a dropped page id.
