# ADR-1013: pending-op × wholesale-swap invalidation audit

## Status

Audit complete — structurally safe (behavioural pin added, v1.8.039).

## Context

Deferred/armed write paths (`_nug` coalesced op, `_sbf` slider
before-buffer, `_eraseBatch`) hold references to shapes that a
wholesale swap (`_rs`, remote 'replace'/'clear', snapshot adopt) can
kill mid-flight. If the armed write later commits against dead ids it
produces a junk wire op + a phantom undo entry.

`applyRemote` deliberately does **not** flush `_nugEnd` — the
`_nugLock` merge (0965/0971) folds concurrent remote writes into the
pending op so undo stays consistent; flushing on every remote op would
break that coalescing design.

## Audit table

| Armed state | Kill scenario | Guard |
|---|---|---|
| `_nug` coalesced op (move/zorder/style/group) | ids dead at flush | `_nugLock` `gone`-filter: dead ids stripped from `ids`/`before`/`after`/`changes`; `_nugEnd` skips empty ops — no history, no broadcast |
| `_nug` on keep-survivors | survivor keeps geometry post-swap | delta/after still consistent; reborn-merge (0971) folds the survivor's remote writes |
| `_sbf` slider before-buffer | shape dies mid-drag | `_sfbBlur`/`_sfbFlush` gate on `byId(id)` — dead entries deleted silently, no op |
| `_eraseBatch` | swap mid-stroke | `_rs` clears; batch window covered by 0952/0953 tomb-or-keep |
| `ptr.*` gesture state | any external invalidation | `_ptrReset`/`_cancelPointerGesture` funnel (0764) — blur/hidden/page-switch/pres |
| `state.draft`, `ptr.lineClick` | swap mid-gesture | gesture-owned per 0969 — cancel restores or drop is intended |
| `state._lastRep`, `state._lastTs` | — | causal markers, not pending writes (0695) |

## Consequences

- Every deferred-write path is dead-id-safe by one of: `_nugLock`
  gone-filter, `byId` gate, or a stroke/gesture-scoped lifecycle.
- Contract: a new armed-write path must either strip dead ids at
  commit time (the `_nugLock` idiom) or clear on the invalidation
  funnel.
- Behavioural pin: armed nudge + remote 'del' → subsequent commit adds
  exactly one history entry — the stale pending op records nothing.
