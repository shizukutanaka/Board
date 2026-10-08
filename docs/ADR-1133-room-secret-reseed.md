# ADR-1133 — doc-carried `rs` reseeds a dead origin store on restore

## Context

The wire auth key (`state.roomSecret`) is a doc-scoped HMAC secret stamped on
every BC/DC message (ADR-1056). Two stores carry it:

- `localStorage['board.rs']` — the **origin authority**: same-origin tabs read
  it inside `_sec()` and converge on one key. It is written exactly once, at
  first mint.
- The IDB doc record's `rs` field — a durability copy persisted with the doc
  (`rs: state.roomSecret` at :8913/:8967) and adopted back on restore
  (:8950, :9015).

`_sec()`'s contract (documented at :903): *"lives on localStorage so
same-origin tabs converge on one key (ls wins over IDB `rs`)"* — the first
branch unconditionally resets `state.roomSecret` to the localStorage value
whenever they differ.

## Defect

The adoption `state.roomSecret=d.rs` was an unconditional write with no
`_ls` reseed:

1. **Dead write while ls is live** — the next `_sec()` call reverts state to
   the localStorage value, so the adopted key never survives (by design — but
   the code pretended otherwise).
2. **Volatile adoption while ls is dead** — the doc secret *did* take (no ls
   to revert it), but stayed in-memory only. The first later tab to mint
   wrote a fresh `board.rs`, and every subsequent `_sec()` call converged the
   restoring tab onto that foreign key — the doc's recovered secret was
   silently abandoned. The one scenario `d.rs` exists for (origin-store loss
   with IDB intact) was precisely the scenario it couldn't survive.

## Decision

Adoption now reseeds the origin store, gated on it being dead:

```js
if(_iS(d.rs)&&_ln(d.rs)<=64){state.roomSecret=d.rs;try{if(!_lg('board.rs'))_ls('board.rs',d.rs)}catch(_){}}
```

- Live `board.rs` → `!_lg` false → no reseed: ls still wins, a doc restore
  can never rotate a live room's key.
- Dead/missing `board.rs` → `_ls` writes `d.rs`: the doc record becomes a real
  durability backup — later tabs and mints converge onto the recovered key.
- `_lg`/`_ls` throws (partitioned storage) → caught, in-memory adoption still
  stands, matching the old behavior.

Applied at both restore paths (`Persist.load` doc restore, `restoreBackup`).

## Consequences

- The doc record is now a working second copy of the room key, closing the
  "ls wiped, IDB intact" durability hole without weakening the ls-wins rule.
- 9 pins: dead-store adoption survives `_sec`, live-store wins, reseed
  reproduces the key on a fresh state, mint persists, oversized ls values are
  inert, both restore sites carry the reseed.
