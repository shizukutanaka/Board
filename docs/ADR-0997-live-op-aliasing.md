# ADR-0997: live↔stored-op reference aliasing audit — complete

## Status
Accepted — documentation + pins. No code change required.

## Context

The op-log (`state.history`) is the source of truth for undo/redo and the
source of wire ops (`_undoWire` reuses its `before`/`after` objects for
broadcast). The axis: **does any producer or apply path share a mutable
object between the live board (`state.shapes` members) and a stored op?**
If so, post-commit in-place mutation would silently rewrite history —
a wrong-shape restore on undo, or a divergence peers never see.

## Audit result — all clean

### `_apply` clones on every push (apply side)
- `add`: `_sh().push(clone(op.shape))` — the live object is a deep clone.
  The *stored* op retains the producer reference (`op.shape === P`); this
  is safe under the convention that producers build a fresh object for the
  commit and never touch it afterwards — no producer mutates its committed
  shape (the only post-commit write is the deliberate
  `_hi()[_hx()].shape=clone(s)` finalize patch). Verified: mutating `P`
  post-commit cannot reach the live shape.
- `addMany` / `del` restore / `clear` restore / `pageAdd` members /
  `pageDel` undo restore: all `clone(...)`, wrapped in
  `Net._attachShape` for img parking.
- `upd`/`move` backward: `clone(raw)` before `_oa` — the live shape gets
  a detached patch.
- `clone` is `JSON.parse(JSON.stringify(o))` — deep, arrays included.

### Producers capture detached snapshots (commit side)
- `del`/`clear` ops: `clone(s)`/`clone(live)`/`clone(sel)`/`clone(mine)`/
  `clone(_sh())` at every commit site (5614, 5777, 6097, 6282, 6288).
- `align`/`gsnap`: `before`/`after` are `sel.map(clone)`.
- `_repC` (local wholesale swap): `after:clone(_sh())`,
  `beforeWc`/`afterWc`/`pages`: cloned.
- `style` patches: fresh `{id, ...primitives}` literals; the one array
  prop (`way`) is explicitly `clone()`d on both sides (4099-4101,
  ADR-0090 comment "arrays clone whole").
- `zorder` `changes`, `connClears`, `move` after-positions: literals.
- Gesture/editor captures (`orig`, `gOrig`, `gAnc`, `cbendOrig`):
  `clone(...)`. `_hi()[_hx()].shape=clone(s)` finalize-patch (5671).
- No in-place `pts.push`/`pts.splice`/`s.pts[i]=` writes exist on any
  committed shape; `wa.splice` mutates the live `way` before an
  `after:clone(wa)` snapshot.

### `_attachShape` is read-only on shared refs
- Returns `{...rest, dataUrl:d}` (a new object) when the blob resolves;
  otherwise parks `s.id` and returns `s` untouched. `_attachOp`'s map
  over `op.after` never rewrites the stored op's members.

### `_undoWire` sharing is send-only
- Swaps `before`/`after` references from the stored op for broadcast —
  serialized immediately, never mutated.

## Pin coverage (test.mjs)

- `byId(id) !== producerObj` after `commit({op:'add'})`.
- Mutating the producer object cannot corrupt the live shape.
- Mutating the live shape cannot corrupt the stored op.
- `del` stores a clone, not the live reference.
- Undo restore pushes `clone(op.shapes[i])` — live ≠ stored.
- `_attachShape` leaves an unresolved parked ref untouched.
