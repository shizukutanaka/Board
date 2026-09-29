# ADR-0722: pageDel snapshots + restores member wclocks

## Status
Accepted (実装済)

## Context
`del` snapshots the deleted shapes' write-clocks into `op.wc` (forward) and
restores them on undo; ADR-0721 carries them to peers on the undo-wire
`addMany`.

`pageDel` did the same purge (`_pgDel2` drops member clocks) but recorded
nothing — an undo of a page delete resurrected members clock-free on *every*
side.

## Problem
Consistent-but-wrong semantics: post-undo, a remote write clocked *between* the
member's pre-delete clock and now applied on all peers (no wclock) — correct
convergence, but the member's arbitration history was silently erased, letting
a stale write overwrite a value that should have stayed deleted-era-newer. del
and pageDel diverged in protection level for no reason.

## Decision
- `_pgDel2` snapshots `op.wc` for the `dead` (purged, unlocked) member set
  before dropping their clocks — same shape as del's snapshot.
- `pageDel` backward restores `op.wc` — same idiom as del backward.
- `_undoWire` 'pageDel' emits `{op:'addMany',shapes,wc:op.wc}` — the
  ADR-0721 addMany `wc` carry applies unchanged.

Locked members survive the delete (ADR-0707) and keep their clocks — they are
excluded from `dead` and from `op.wc` by construction.

## Consequences
- Undo of a page delete is arbitration-convergent AND arbitration-faithful:
  member properties keep their pre-delete winners on every peer.
- Two-peer pin: style→pageDel→undo restores `wclock[member].stroke`.
