# ADR-1175: unhealable member rehome — `pg` scrub when no stub is possible

## Status
Accepted (v1.8.199). Extends ADR-1137 (`_stubOk` tomb gate) and ADR-0692/0693
('?' stub heal); member-side counterpart of ADR-1174's `curPg` re-derivation.

## Context
Two sites produced a `'?'` stub page when a shape carried a `pg` for a page not
in `state.pages`: `_pgHealS` (set-level heal — boot, union merge, pageDel
tails) and the op-intake stub loop (`applyRemote`'s `f`). Both ran the same
gate: `s.pg && !_pgById(s.pg) && _stubOk(s.pg) && _ln(_pgs())<64`.

Question both gates left open: what happens when the stub CANNOT be produced —
(a) the referenced page is tomb-dead (`!_stubOk`), or (b) the page set is full
(64 pages)? Answer: nothing. The member kept `pg=<dead-id>`; `_pgOk` is false
for it on **every** page (a non-null `pg` never falls back) → invisible,
unreachable, silent. The ADR-1174 cap-drop makes (b) load-bearing: a snapshot
filling the cap drops local pages, leaving their members dead — and the same
cap forbids the stub that could have saved them. Tomb-dead members (a) were
already invisible since ADR-1137 rightly refused the stub.

## Decision
Extract the per-member decision as `_pgHeal(s)`: stub when there is room and
no tomb vetoes it; otherwise scrub `s.pg`. A pg-less member attributes to
`pages[0]` via `_pgOk`'s fallback — the same rehome `_pgDel2` performs for
members of a deleted page (`s.pg=null` → `pages[0]`). One predicate, one rule,
both producers share it (`applyRemote` delegates its inline `f`).

```js
const _pgHeal=s=>{if(s.pg&&!_pgById(s.pg)){
  if(_stubOk(s.pg)&&_ln(_pgs())<64)_pu(_pgs(),{id:s.pg,name:'?',nts:-1});
  else delete s.pg}};
const _pgHealS=()=>{if(_pgOn())for(const s of _sh())_pgHeal(s);else ...};
```

Stub vs rehome is a fork, not a preference: an unknown-no-tomb `pg` is evidence
the page is merely in flight (op-order lag) — preserve it via '?' so a later
`pageAdd` can complete it. A tomb-dead or cap-blocked `pg` names a page that
cannot exist — scrubbing is the only reachable repair and rehomes the member
instead of stranding it invisible.

## Consequences
- Every member stays reachable: stub page when producible, `pages[0]` when not.
  Convergent: the same input page set drives the same local decision on every
  peer; `pg` itself re-arbitrates as a normal prop later.
- No page resurrection: tomb-dead ids still get no stub (ADR-1137 intact); the
  member rehomes without reviving the page.
- The op-intake site gains the rehome arm for free (same delegation).

## Pins
- 2 behavioural in the ADR-1174 world: cap-dropped member rehomes (`pg`
  scrubbed) and stays `_pgOk` on the landed page.
- 1 behavioural in ADR-1137's block: tomb-dead member rehomes (no stub, pg
  scrubbed).
- 3 source literals recalibrated to the shared `_pgHeal` (both producers +
  the helper itself).
