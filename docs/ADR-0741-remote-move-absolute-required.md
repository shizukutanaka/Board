# ADR-0741: remote 'move' requires absolute positions

## Status
Accepted (2026-09-28)

## Context
ADR-0729/0732 made the wire 'move' absolute — `_slimOp` rebuilds every outgoing
move (forward and undo-wire) as `{id,x,y}` after/before arrays, because a delta
applied on a raced base diverges with no convergence mechanism to repair it
(existence is tomb-driven; positions are per-prop LWW — a wrong x just stays
wrong until a newer absolute write covers it, and the delta apply even stamps
`wclock[id].x` with the delta op's clock, poisoning subsequent arbitration).

But `validRemotePayload` still *accepted* the bare pre-0729 delta form
(`{ids,dx,dy}`, after optional). Stale-SW old-version tabs are a realistic
mixed-version source — the Service Worker caches index.html, so an old build
can sit in the same BroadcastChannel room as a new one for days. One delta move
from such a peer silently diverges positions on every current-version peer AND
stamps `w.x` — dropping the new peer's own later absolute write if its clock
loses the race.

## Decision
`patches(op.after)` is now required on remote 'move' (was `after==null||`).
Current peers always send it; old-version senders are rejected — their delta
can't corrupt the convergent state of new-version peers. Local commits keep the
internal delta form (never through `validRemotePayload`).

## Consequences
- New-version peers stay mutually convergent in mixed-version rooms.
- Pre-0729 peers' moves are silently dropped on new-version peers — the old
  peer's board diverges regardless; rejection is strictly better than applying.
- Behavioural pins: bare-delta remote move no-ops; absolute remote move lands.
