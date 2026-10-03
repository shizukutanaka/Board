# ADR-1015: history boundedness × trim-boundary audit

## Status

Audit complete — structurally safe via the tip-only-trim invariant
(behavioural pin added, v1.8.041).

## Context

`MAX_HISTORY=500` caps `state.history`; `_recordCommitted` drops the
oldest op on overflow. A head-shift adjusts every index downward — if
`histIdx` is not also decremented, undo/redo drifts onto the wrong op
(one-step-off divergence vs peers and the applied board state).

## The tip-only-trim invariant

```
_recordCommitted(op):
  if(histIdx < len-1) len = histIdx+1   // chop redo branch
  push(op)                            // len = histIdx+2
  if(len > MAX) shift()               // histIdx unchanged
  else histIdx++                      // histIdx = len-1
```

Trim fires iff `histIdx+2 > MAX` ⇔ `histIdx > 498` ⇔ `histIdx == 499
== len-1` — i.e. **only at tip**, where the pushed op is the last
applied and `histIdx == len-1` must remain. With `len ≤ MAX-1` after a
mid-undo chop, the shift branch is unreachable, so `histIdx++` always
lands on the new tip. No numerical adjustment is ever needed on the
shift path — the invariant holds by construction, not by accident:
`histIdx` stays `len-1` across every trim.

## Audit table

| Path | Mechanism | Result |
|---|---|---|
| `_recordCommitted` tip push | `len>MAX` → `shift()`, histIdx stays len-1 | correct |
| mid-undo commit | chop to `histIdx+1`, push → ≤ MAX | `histIdx++` → tip; redo branch destroyed (verified) |
| `undo()` floor | `if(histIdx<0) return` | can't walk before index 0 |
| `redo()` ceiling | `if(histIdx>=len-1) return` | can't walk past tip |
| restore/import | history never persisted (`_rdb` is UI state) | no stale-pointer hydration |
| 2nd writer site (1571) | identical chop→push→shift/inc shape | same invariant |

## Consequences

- `histIdx` is always `len-1` immediately after any commit; an
  undo→commit sequence destroys the redo tail deterministically.
- Contract: any new history writer must preserve chop-then-push order
  so the shift path stays tip-only.
- Pin covers: undo+commit kills `Store.redo()`; >MAX pushes keep
  `histIdx == len-1` and undo() walks the newest op.
