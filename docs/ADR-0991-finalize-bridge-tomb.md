# ADR-0991: Finalize-bridge tomb parity (local `_del` clock == broadcast clock)

## Status
Accepted — implemented in v1.8.017.

## Context
`_syncTextFinalize` emits **broadcast-only** ops (no local history) to bridge the
text/sticky editor's lifecycle to peers: a fresh `upd` carrying typed content, or
a `del` when an empty new shape is removed after peers already received the blank
`add`.

For the `del` branch the shape was already removed locally by `Store.undo()` of
the original `add`. That backward apply writes a `_del` tomb into the local
wclock — with the **undo's clock**. Peers, on receiving the broadcast `del`,
write `_wD(id, broadcast-clock)` — the **broadcast op's clock**.

Two different clocks for the same logical delete:

- Local tomb: `undo-clock` (earlier — fabricated when the undo ran)
- Peer tombs: `broadcast-clock` (later — fabricated inside `_syncTextFinalize`)

Any shape-carrying op (snapshot add, replace-born, forged add) arriving with a
clock `c` where `undo-clock < c < broadcast-clock` is **adopted** locally
(`_tmb` fails — c outranks our tomb) but **dropped** on every peer (`_tmb` holds —
their tomb outranks c). One-way resurrection = divergence.

The window is small (the two clocks are fabricated moments apart) but the class
is the same one ADR-0734/0926/0927 closed elsewhere: tomb clocks must be
identical on all boards or arbitration diverges.

## Decision
In the `deleted` branch, after `_fck(op)` assigns the broadcast clock, restamp
the local tomb to that clock, mirroring peers' del-apply gate-for-gate:

```js
if(deleted)_bN(s.id,op.clock)||_wD(s.id,op.clock);
else Store._stampWrites(op);
```

- `_wD(id,c)` = `state.wclock[id]={_del:c}` — byte-for-byte the same write the
  peers' `del` apply performs (`_wM({_del:op.clock})`), so local and peer tombs
  are now identical: every shape-carrying op is arbitrated the same way on every
  board.
- `_bN(id,op.clock)` mirrors the del-apply's "newer `_born` outranks this del"
  gate (ADR-0926): if a newer (re)birth exists locally, the tomb must not be
  written — the reborn shape legitimately survives on peers too (their del-apply
  skips it via the same check), so both sides stay alive-and-consistent.

## Why not stamp the tomb unconditionally?
If `w._born > broadcast-clock`, a remote rebirth already won — peers would skip
the del for this id too. Writing `_del` anyway would leave us tombed while peers
are alive: the mirror-image divergence.

## Why not propagate the undo's original tomb clock?
`op.clock` must be a fresh clock (the op is brand-new on the wire); the tomb on
peers is derived from that op's clock by construction, so reusing the undo clock
is impossible — restamping is the only parity direction.

## Consequences
- `undo-backward tomb` and `broadcast tomb` now share one timestamp → identical
  `_tmb` verdicts across boards for every carrying op.
- The `upd` branch is unchanged: `_stampWrites` records `text/w/h` under the
  broadcast clock for LWW (our finalize wins ties, loses to genuinely newer
  remote writes).
- Broadcast-only remains: no history entry (undo = one step, per ADR-0443
  design).

## Pins (test.mjs)
- del bridge emits `op:'del'` carrying the shape id.
- local `_del` restamps to a clock newer than the pre-existing undo tomb.
- a snapshot-carried shape older than the tomb is `_tmb`-blocked locally too.
- a newer `_born` prevents the tomb restamp (ADR-0926 parity).
- the upd branch still stamps `text` under the local peer clock.
