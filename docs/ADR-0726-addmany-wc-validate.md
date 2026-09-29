# ADR-0726: validate the addMany wclock snapshot on the wire

## Status
Accepted (実装済)

## Context
ADR-0721 made `del`/`clear`/`pageDel` undo-wires carry a `wc` clock snapshot
inside the emitted `addMany`, but `validRemotePayload` never checked it —
`case 'addMany'` validated only `op.shapes`. A malformed `wc` (non-object
entries, `ts:NaN`, object-typed clocks) would stamp junk into `wclock`, and
`clockNewer` comparisons coerce non-numbers to NaN → arbitration diverges
silently from that point on. The symmetric `replace.afterWc` has been
validated since ADR-0613; the undo-wire path lacked parity.

## Decision
Hoist `wcOk` ({id:{prop:clock}} shape, ≤MAX_OP_SHAPES ids, every prop a
`validClock`) to the top of `validRemotePayload` and apply it to
`op.wc` on `addMany` when present (`wc==null` keeps legacy ops valid).

## Consequences
- The only remaining un-validated clock-map ingress closed; malformed wc is
  rejected before any wclock write.
- Wire-family parity: snapshot, replace.afterWc, addMany.wc all validated.
