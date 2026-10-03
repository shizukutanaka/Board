# ADR-0926: existence clock — a kill op loses to a newer (re)introduction

## Status

Accepted (2026-10-01)

## Context

Per-property LWW (ADR-0002) arbitrates every *value* under one total order,
`clockNewer(ts,peer,seq)` — but **existence** was not. Tombstones (ADR-0734)
gate stale `add`s losing to a `_del`, yet the kill paths themselves wrote the
tomb unconditionally: `del`, `clear`/`replace` removal, `pageDel` and
add-backward all stamped `{_del:op.clock}` and removed the shape with no
born-vs-kill comparison.

So a `del` that had already *lost* the causal ordering still applied: when it
arrived after a newer re-introduction of the same id, the shape vanished on
the receiving peer while the sender kept it — arrival order decided existence.
Divergence.

The same asymmetry existed between the two gate helpers: `_tmb` (add-side:
does a tomb outrank this add?) consulted the tomb, while nothing asked the
inverse question on the del side (does a newer birth outrank this del?).

## Decision

Give every id an existence clock — the OR-set add-wins register:

- `_bT(id,clock)` stamps `wclock[id]._born` at every introduction site (add /
  addMany / del-backward restore / clear-backward restore / replace survivors /
  pageAdd members / pageDel-backward restore), keeping the newest seen clock.
- `_bN(id,clock)` reports whether a newer `_born` already exists.
- Kill paths (`del`, `clear`/`replace` removal, `pageDel`) gate on `_bN`
  before tombing/removing — a losing kill stamps nothing and removes nothing,
  on every peer.
- `nowTs()` becomes a strict HLC: `max(wall, _lastTs+1)` — a local op issued
  after observing remote clock C always outranks C, so a del issued after
  seeing the add it targets cannot lose on equal-ts tiebreaks.
  (Prior behaviour clamped to equal ts, where the peer-id tiebreak could
  reverse the causally-correct outcome — e.g. a remote born beating the del
  issued to cover it.)

`_bN` and `_tmb` now evaluate the same born-vs-kill contest under the same
total order, so existence is deterministic regardless of arrival order.

## Consequences

- An observed remote write is still beaten by a local op issued after it
  (undo after seeing a remote write now strictly outranks it — convergent on
  both peers); three undo expectations were re-pinned to the new ordering.
- test.mjs: a two-world teardown quiesces world B (`_send`/`broadcast` unwired,
  deferred `_snapT` cleared) — its late snapshot could otherwise `applyRemote`
  into single-world tests mid-`await` (the long-press flake).
- `pass += 1895` (+7 existence-clock pins: stale del loses to newer born, no
  tomb on a losing del, newer del wins + tombs, stale re-add loses to tomb).

## References

- ADR-0734 — del tombstones gate stale adds (the opposite half of this order).
- ADR-0924 — backward-apply convergence audit (parent cluster).
