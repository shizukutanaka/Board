# ADR-0924: backward-apply convergence audit complete

## Status

Accepted (2026-10-01)

## Context

After the ADR-0916–0923 cluster hardened the backward (undo) apply paths —
locked parity (0712/0713/0716/0923), per-key LWW restore (0733/0921), tomb
gates (0734/0922), connClears integrity (0920) — the remaining question was
whether anything in the undo/redo machinery could still diverge silently:

- Does every history-carrying op have a wire inverse (`_undoWire`)?
- Does the local backward apply match what peers run for the same undo?
- Do the bookkeeping helpers (`_stampWrites`, `_selR`, `_pgFollow`, `_opIds`)
  behave symmetrically across the undo and remote-apply paths?

## Decision

Record the verified-clean result; no code change. `v1.7.950`.

## Audit matrix

| Surface | Check | Result |
|---|---|---|
| `_undoWire` coverage | All 17 ops in history (`add addMany del clear move upd style resize align beautify group ungroup zorder replace pageAdd pageDel pageName`) have a wire inverse; `default:null` unreachable | clean |
| Redo | Rebroadcasts the ORIGINAL op restamped via `_fck` (ADR-0718) — no inverse needed; `_lastRep` maintained for `replace` | clean |
| connClears re-bind | Undo-wire emits `{op:'upd',id,after:c.before}` — peers restore bindings through the normal `upd` forward path (locked gate + strip + LWW), locally `_ccRest` does the same per key (ADR-0921); `op.before==null` is legal intake for `upd` | clean |
| group/ungroup | Undo-wire emits dedicated ops reconstructed from `before`; forward skips locked exactly like the backward loop (ADR-0923); unreachable `gids` fallback removed | clean |
| `_stampWrites` | Runs on each emitted wire op (`this._stampWrites(w)`), stamps the keys of the wire op's `after` — same keys the local backward apply wrote; groupId/frac/id/type/pg/underscore keys excluded (ADR-0914/0916) | clean |
| `_selR`/`_ss` | Drops missing, hidden (`_sv`), and off-page (`_pgOk`) ids — no dead ids can enter selection via `origSel` restore | clean |
| `_pgFollow` | pageAdd/pageName land via `switchPage` guarded by `_pgById`; pageDel lands via `_pgDel2`; other ops land on the first touched shape's page; harmless when target page was just removed | clean |
| `_opIds` damage harvest | Covers `shape/shapes/before/after/changes/connClears` — restored connectors and bound-conn sweep regions repaint | clean |
| move undo-wire | Absolute `{before,after}` swap when present (ADR-0732); delta fallback only for legacy ops without snapshots | clean |
| replace undo-wire | `after:op.before` + `afterWc:op.wc` + `pages/curPg` carry (ADR-0615/0720); forward `wc0` tomb gate (0922) | clean |
| pageDel undo-wire | `pageAdd` + `addMany(wc)` + connClears `upd`s — member clocks restored (0721/0722) | clean |
| pageName undo-wire | Carries the restored name clock `nts:bts` (0727) so peers stamp the undo at the same point in time | clean |

## Consequences

- The backward-apply convergence family is closed: every remaining gap found
  since ADR-0702 is now either fixed (0707–0737, 0916–0923) or verified
  unreachable (this audit).
- `pass += 1888` unchanged (no new asserts — audit is source-pin-free).

## References

- ADR-0716/0923 — locked parity on structural ops.
- ADR-0921/0922 — per-key LWW restore + tomb gates on backward.
- ADR-0918 — forward apply-side audit (companion).
