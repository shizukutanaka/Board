# ADR-1016: wire-intake `_attachOp` × apply coverage audit

## Status

Audit complete — structurally safe (behavioural pin added, v1.8.042).

## Context

`Net._attachShape` resolves a shape's parked `s.img` ref to a held
`dataUrl`, or parks the shape in `_imgPending` so the imgq re-request
loop can heal it later. Any wire path that lands a shape WITHOUT the
attach step leaves a permanent broken placeholder (no re-request armed).

## Order

```
Net._onRecv 'op' / reassembled frag:
  op = this._attachOp(msg.op)     // add / addMany / replace.after
  → validate → dedup (_ck+seenOps) → Store.applyRemote(op)
    → _apply pushes clone(op.shape)   // already attached upstream
Net._mergeSnapshotOp:
  op = this._attachOp(op)         // snapshot-embedded adds
  → Store.applyRemote(op)
```

## Coverage table

| Push site | Attach? | Why safe |
|---|---|---|
| wire `'add'` forward (1626) | `clone(op.shape)` raw | op.shape was attached at intake `_attachOp` — parking already armed |
| wire `'addMany'` (1661), `'clear'`/`'del'` backward, `'replace'` next (1713), pageAdd members (1733) | `_attachShape(clone)` in `_apply` | belt & braces for ops that bypass intake (local undo re-push, `_recordCommitted`-only paths) |
| snapshot adopt (8317), IDB restore (8722/8783) | per-shape `_attachShape` | parked refs parked or resolved |
| local `Store.commit` producers | no attach needed | locally-built shapes carry real `dataUrl`; parked refs only exist on wire-derived shapes |
| `_oa` patch-carried img (845) | inline `_park` | ADR-0841 single gate |

## Consequences

- Every wire-derived shape either passes `_attachOp` at intake or
  `_attachShape` in `_apply` — parked refs always arm the waitlist.
- Contract: any new wire intake must run `_attachOp` before
  dedup/apply; any new `_apply` push of a shape array uses
  `_attachShape(clone)`.
- Pin covers: `Net._onRecv` 'add' with `s.img` ref → shape lands +
  `_imgPending` holds the key for imgq re-request.
