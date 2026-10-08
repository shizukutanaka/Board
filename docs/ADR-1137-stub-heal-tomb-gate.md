# ADR-1137 — stub-heal tomb gate on the op-intake path

Status: Accepted (round887)

## Context

'?' page stubs are the forward-compatibility heal for a shape that references a
page id the receiver doesn't know yet (ADR-0775). Three producers create them:

- `applyRemote`'s intake heal `f()` — every remote op carrying `op.shape`/`op.shapes`
  with an unknown `s.pg` stubs the page *before* `_apply` runs.
- `_pgHealS` — the per-apply tail that heals member shapes pointing at unknown pages.
- Snapshot union-heal — merges `msg.pages` + shape-carried `pg` on join.

ADR-1093 put page ids on the tomb mechanism (`_wD`/`_bT`/`_bN`) so a deleted page
can't zombie-resurrect, and the latter two heal paths were tomb-gated
(ADR-0694/1110/1093). `f()` was not: it checked only `!_pgById(o.pg)`, so a remote
shape carrying a **tomb-dead** `s.pg` pushed `{id, name:'?', nts:-1}` straight
through the page tomb — the exact resurrection the tomb exists to prevent.

Concrete divergence: peer A pageDel's page P (page tomb `_wD(P)` on the delta
channel). Peer B had a pending/offline `add` whose shape still says `pg:P` and
lands after the tomb. A's `f()` heal stubs P back to life — a zombie page B
doesn't have, forever divergent `state.pages`, `curPg` inconsistent, and the
stuck stub never promoted because no real `pageAdd` follows (pageAdd for a tombed
id is itself gated by `_tmb`).

## Decision

Extract the tomb-dead predicate `_pgHealS` already carried into a shared
`_stubOk(id)` — `!w || !w._del || (w._born && clockNewer(w._born, w._del))` —
and gate `f()` on it identically:

    const _stubOk=id=>{const w=_wc()[id];return!w||!w._del||w._born&&clockNewer(w._born,w._del)};

Both producers now run the same gate; the snapshot union-heal keeps its own
(carried `bts` arbitration instead of the receiver's `_born`, ADR-1110).

Semantics preserved:

- **Unknown page** (no wclock entry): stub still created — `f()`'s original job.
- **Born-newer id** (`_born` outranks `_del`): stub still created — the same
  escape ADR-1094 gave `pageDel`/`pageAdd`, so a legit rebirth heals.
- **Tomb-dead id**: no stub. The shape installs with a dangling `s.pg`; `_pgOk`
  keeps it invisible on the tomb verdict, and the page only revives when a real
  `pageAdd`/`bts` outranks the tomb (ADR-1110 semantics) — convergent, because
  every peer applying the same wclock pair reaches the same verdict after the
  pairwise `_born`/`_del` merge.

This also covers the `del` kill-set shape records flowing through `f()` — a
tomb-page reference in a killed shape can't stub either.

## Consequences

- The '?'-stub surface is now uniformly tomb-gated; the intake back-channel that
  bypassed ADR-1093 is closed.
- `_stubOk` single-sources the predicate — the same extraction pattern as
  `_tmE`/`_bN`.
- 7 behavioural pins: literal pins on the helper + both call sites; remote
  `add`/`del` with tombed `pg` grows no stub while unknown and born-newer ids
  still heal.
