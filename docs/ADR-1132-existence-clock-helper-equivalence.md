# ADR-1132 — existence-clock helpers share one dominance relation

## Context

Convergence keeps two per-shape existence clocks in `state.wclock[id]`: `_born`
(newest (re)introduction) and `_del` (newest tombstone). Every admission path —
op intake, undo restore, snapshot adopt, page-tomb arbitration — must decide
"is this id tombed for me?" the *same* way, or peers silently disagree about
which shapes exist. Three helper entry points express that relation:

- `_tmE(w,op)` (`_tmb(id,op)` is the by-id delegator) — *tomed-at-arrival*: the
  recorded `_del` is newer than the arriving op's clock AND no `_born` outranks
  the `_del`.
- `_bN(id,c)` — *born-newer*: a recorded `_born` outranks clock `c` (lets a
  fresh introduction beat a stale kill on every site).
- `_tAlive(id,rw)` — *tomed-for-adopt*: a bare `_del` kills an incoming shape
  unless the local `_born` OR a snapshot-carried `rw._born` outranks it.

## Audit (round882)

Five surfaces were swept; all closed:

1. **Helper equivalence** — all three implement the same dominance:
   `_born` newer than `_del` ⇒ alive on every path; `_del` newer than the
   arriving clock ⇒ gate; missing `_born`/`_del`/entry degenerates correctly.
   `_bT` only ever upgrades `_born` (monotone), so a stale restore can't
   backdate an existence clock.

2. **`_attachOp` coverage** — `add`/`addMany`/`replace` shape payloads attach
   at intake; `pageAdd` members attach at apply-site (:1800), restore loops
   (`del`/`clear`/`pageDel`) attach identically. `_placeCopies` remaps every
   structural field — fresh `id`, dropped `frac` (new `z`), fresh `groupId`
   via a per-paste map, `a`/`b` rebound only when inside the paste set, `pg`
   re-scoped to `curPg` — so no foreign namespace survives a merge import.

3. **MAC peer binding** — `_canon` signs the whole message minus
   `mac`/`dmac`/`data`, so `msg.peer` is inside the digest (sender spoofing
   breaks the tag). The `data` exclusion (img chunks) is compensated by the
   `_imgHash` content-address check at intake.

4. **`origSel` non-carriage** — `_slimOp` strips `origSel`, so `_selR(op)` on
   remote paths is a guaranteed no-op (selection stays local-only).

5. **`_shCap` coverage** — every remote `_sh().push` is gated; the 'replace'
   member install is un-gated but its source (`op.after`) is bounded at
   `MAX_OP_SHAPES` at intake, and keep-survivors legitimately outrank the wipe.

Also closed earlier in the same sweep: the ADR-1048 P0-b imgq heal → repaint
path exists (`_iv()` on blob arrival + `img.onload` → `Minimap.invalidateCache`).

## Decision

Document-only + pins: assert the dominance relation directly on each helper
(`_tmb`, `_tmE`, `_tAlive`, `_bN`, `_bT` added to the test export surface). A
regression here is silent and poisons every op path, so the pin is the defense.

## Consequences

- 12 behavioural pins lock: tomb-gates-stale-op, stale-tomb-releases,
  born-outranks-del (arrival + adopt + carried), born-newer fire/release,
  unknown-id-not-dead, `_bT` stamp/upgrade/no-downgrade.
- No code change beyond the version stamp; raw budget untouched (~546 KB).
