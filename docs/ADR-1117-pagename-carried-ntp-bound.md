# ADR-1117 — Bound the carried `ntp` on wire `pageName`

## Status

Implemented (round867). Behavioural pins in test.mjs ("ADR-1117 pageName ntp
bound (6 asserts)"); this file is the design record.

## Context

ADR-0698 made page renames converge on a `(ts, peer)` total order; the page
record carries `nts`/`ntp` as its name clock. ADR-0702/0727 made undo of a
rename converge by *carrying the restored clock*: `_undoWire` emits the inverse
`pageName` with `nts: op.bts, ntp: op.btp`, `_slimOp` ships `nts`/`ntp` on the
wire, and a peer's forward apply adopts them when the rename wins:

```js
if(forward&&op.nts!=null){if(_tsOK(op.nts))p.nts=op.nts;if(op.ntp!=null)p.ntp=op.ntp}
```

`nts` was bounded at intake by `_tsOK` (finite, ≤ wall+5min — ADR-0700/0791)
**and re-checked at apply**. `ntp` had *no* check anywhere: any non-null value —
an unbounded string, an object, a number — landed verbatim into `p.ntp`.

`p.ntp` then (a) persists to IDB with the doc, (b) gossips to peers inside
`msg.pages` (which is `_vPages`-validated on *their* intake — so the poisoned
field stays local), and (c) is read as the `peer` of the name clock in
`clockNewer`'s equal-ts tie-break (`a.peer > b.peer`, a string compare). A MAC-
authenticated peer shipping `pageName{nts: <valid>, ntp: '￿'.repeat(200)}`
wins every subsequent equal-ts rename arbitration — a durable rename-pinning
position — and a non-string `ntp` silently skews `clockNewer` for everyone who
adopted it. This is the same shape as ADR-0779 (bounded `clock.peer`) and
`_vPages`' `(p.ntp==null||_iS(p.ntp)&&_ln(p.ntp)<=64)` — the wire `pageName` op
was the one `ts`-carrying message whose peer field had no bound.

## Decision

Two layers, mirroring how `nts` is defended:

1. **Validator** (`validRemotePayload`, `case 'pageName'`): add
   `(op.ntp==null||_iS(op.ntp)&&_ln(op.ntp)<=64)` — the exact `_vPages` bound.
   A malformed `ntp` rejects the whole op, so the poisoned field can never
   reach `p.ntp`.
2. **Apply-side** (`_apply` forward): `if(op.ntp!=null&&_iS(op.ntp)&&
   _ln(op.ntp)<=64)p.ntp=op.ntp` — sibling of the `_tsOK(op.nts)` recheck on
   the same line, covering ops that reach `_apply` without passing
   `validRemotePayload` (local commits, harness applies).

`bts`/`btp` need no bound: they are stripped by `_slimOp` (the wire carries
only `{op,id,after,clock,nts,ntp}`) and are only read on the backward path,
which consumes the locally recorded op.

## Consequences

- A forged `ntp` can no longer win equal-ts rename races or poison the
  persisted/gossiped page record.
- Legit renames unchanged: real `ntp` values are ≤64-char peer ids (or `''`).
- Equal-ts `pageName` arbitration remains honest.
- The audit that found this — *every `ts`-bearing wire field must bound its
  paired peer string* — now verifies clean: `clock.peer` (0779),
  `namePeer`/`ntp` on pages (`_vPages`), `sync-req`/`dels` `wc` (`wcOk` →
  `validClock`), docName `name` msg writer (envelope `peer`), and now
  `pageName.ntp`.
