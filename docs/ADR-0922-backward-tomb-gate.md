# ADR-0922: Backward shape restores gate on the `_del` tombstone

## Status

Accepted (2026-10-01)

## Context

`del`, `clear`, `pageDel`, and `replace` all record the deleted shapes so undo
can restore them. Their backward (undo) apply paths pushed each shape back
with only an `!byId` check.

The corresponding wire paths already gate on the wclock tombstone: the
undo-wire `addMany` (what `del`/`clear`/`pageDel` undos broadcast to peers)
skips any shape whose `wc[id]._del` outranks the op clock
(`clockNewer(wd._del, op.clock)`), and a peer applying a forward `replace`
runs the same tomb check against `wc0`.

Locally the gate was missing at all four restore sites (and `replace`'s
backward variant skipped it explicitly via `forward&&wc0[s.id]`).

Under clock skew the divergence is concrete: a remote `del` carrying a `ts`
ahead of the undo clock leaves a tombstone `wd._del` that outranks the undo
op's clock on every node.

- Peers: the undo-wire `addMany`/`replace` drops the tombed shape — it stays
  deleted.
- Local undoer: the `!byId` restore pushed it back anyway.

Local board shows the shape, every peer shows it gone — an existence
split-brain with no heal path (the local wclock keeps the outranking tomb,
so even a later snapshot merge can flip the local board).

## Decision

`_tmb(id, op)` — the single gate, folded across every restore site:

```js
function _tmb(id,op){
  const wd=_wc()[id];
  return !!(wd&&wd._del&&clockNewer(wd._del,op.clock||{}))}
```

- `del` backward, `clear` backward, `pageDel` backward: `!byId(id) &&
  !_tmb(id, op)` guards the push.
- `replace`: `forward&&wc0[s.id]` → `wc0[s.id]` — the pre-swap wclock is
  captured for both directions, so the backward restore now runs the same
  tomb check peers run on the forward wire.
- Existing gates folded onto the helper: `add` forward, `addMany` forward.
  (`pageAdd` member restore already gated identically.)

## Consequences

- Existence now converges under skew: a tomb that outranks the undo keeps
  the shape dead on the undoer too — matching what peers computed.
- Un-tombed siblings still restore; the surviving tomb stays in wclock.
- test.mjs pins the del-backward path: future-ts `_del` on `gs1` → not
  restored, sibling `gs2` restored, tomb preserved (3 asserts).
- `pass += 1886` (prev 1883 + 3).

## References

- ADR-0734 — tombstones outrank stale adds (the forward-side gate this
  mirrors).
- ADR-0921 — connClears backward LWW-gates (same backward-apply parity
  family).
- `_wR`/`_wD`/`_wTb` — wclock write/merge/tomb helpers.
