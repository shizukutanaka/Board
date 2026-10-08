# ADR-1126: structural-prop drop emits via dedicated op channels

Status: implemented (v1.8.150, round876)
Related: ADR-1123 (3-way text merge + emit), ADR-1124 (snapshot-channel
emit), ADR-1125 (generic-prop op-path emit), ADR-0653 (zorder frac LWW),
ADR-0916 (groupId structural strip)

## Question (Socratic)

ADR-1125 made `_lwwDrop` re-emit a convergence `upd` whenever a remote op's
prop loses to a newer local clock. Does the same asymmetry remain?

Yes — `_lwwDrop`'s two *structural* branches filter divergent writes with
no emit at all:

- `group`/`ungroup` filters `ids` on the `groupId` clock;
- `zorder` filters `changes` on the `frac` clock.

If the local `groupId`/`frac` clock wins, the remote intent is dropped and
the sender (plus every other peer) keeps its stale structural value
forever — exactly the permanent-divergence shape ADR-1124/1125 closed for
generic props.

## Why not `upd` emits

`_emOK` / `_stripStruct` exclude `groupId`, `frac`, `pg` and `_`-keys from
`upd` patches (they are structural, not prop-patches). Riding `upd` would
route the value through a grammar that deliberately rejects it.

## Decision

Emit via the op's *own* channel, extended through `_txFlush`:

- group-ish drops queue `{op:'group'|'ungroup',id,b,a}` — flushed as a
  minimal single-member `group`/`ungroup` op (`before` carries the remote
  intent so receiver-side `_chg` coverage holds);
- zorder drops queue `{op:'zorder',id,b,a}` — coalesced into one
  `zorder{changes:[{id,before:b,after:a}]}` op;
- generic-prop drops (ADR-1125) keep coalescing into `upd` ops.

Emits are committed through `_txC` — a *headless* commit: fresh `_fck`
clock, seen-ops dedup, `_stampWrites`, `_ps` persist, `Net.broadcast`. No
`_apply`, no history slot, no `_rdb` repaint.

## Why headless

The first cut committed emits via `Store.commit`. The ADR-0926 pin caught
it: an emit in `state.history` means ⌘Z *un-converges* the board — undo
restores the stale value the convergence just settled. An emit is a
propagation artifact, not a user edit; it must not occupy an undo step.

Two stale pins (ADR-1124 merge emit, ADR-1125 full-drop emit) asserted
`history.length === hlen+1`; they were re-calibrated to `hlen` plus a
broadcast-captured op — a legitimate contract change, not a test
workaround.

## Exclusions

- Emit only when the write diverges (`b !== a` after normalize): equal
  values emit nothing (idempotent, no ping-pong).
- Emit only when `w[k]` exists and the remote clock does *not* win — the
  remote-winning path already lands locally.
- ungroup emits only when `e.b` is a real gid (wire grammar requires
  `gids:[non-empty str]`); a `groupId:null` intent emits as `group`.
- `state.ro` still swallows the whole drain before broadcasting.

## Convergence argument

The emitted op is a real wire op with a fresh local clock. Each peer's
per-prop LWW re-arbitrates it; if the recipient's clock still wins, it
emits back. The clock winner settles both sides — same argument as
ADR-1124/1125, now covering structural props.

## Pins (test.mjs, ADR-1126 block)

- group/ungroup/zorder emit op shapes land on `Net.broadcast` (15
  asserts);
- an emit consumes no undo step — `Store.undo()` restores the real prior
  edit, not the emit (2 asserts);
- equal-value and clock-less drops emit nothing (2 asserts).
