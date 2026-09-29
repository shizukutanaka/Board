# ADR-0727: pageName undo-wire carries the restored name clock

## Status
Accepted (実装済)

## Context
Page renames converge via (p.nts, p.ntp) LWW (ADR-0698/0702). Undoing a
rename restores `p.nts=op.bts`, `p.ntp=op.btp` locally — the pre-rename
clock — but `_slimOp` stripped `bts/btp` from the wire op as "undo-domain",
so peers applied the reverted *name* while stamping `p.nts = <fresh undo
clock>`. Result: same name on every side, different clock — a subsequent
rename with `bts < T < undoClock` wins on the undoer but loses on peers.
Same failure class as ADR-0721 (del/clear wclock snapshot) — reverted
state must ride its ORIGINAL clock, not the undo's fresh one.

## Decision
- `_undoWire` 'pageName' emits `nts:op.bts, ntp:op.btp` — the restored
  clock pair.
- `_slimOp` carries `nts`/`ntp` when present on a pageName op.
- The forward apply keeps gating on `op.clock` (the undo must still win),
  but writes `p.nts=op.nts` / `p.ntp=op.ntp` when carried (finite-check on
  nts).

## Consequences
- Reverted name + its clock converge: `bts`-era renames lose identically.
- Two-peer pin: rename→undo leaves name='Old', nts=500, ntp='peerC' on
  both sides (was ~now/undoer on the peer).
