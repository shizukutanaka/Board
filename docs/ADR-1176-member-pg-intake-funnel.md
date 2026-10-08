# ADR-1176: member-pg intake funnel — every writer resolves or heals

## Status
Accepted (v1.8.200). Clean-audit record; continues the dead-pg axis
(ADR-1173 intake homing, ADR-1174 curPg re-derivation, ADR-1175 unhealable
rehome) to its completion boundary: a census of every `s.pg` write site.

## Question
`_pgOk` falls back only when `pg` is null — a member carrying `pg=<dead-id>`
is invisible on every page. Can any reachable writer leave `s.pg` pointing at
a page that does not exist, bypassing both resolution and heal?

## Audit — writer census
Every `s.pg=` assignment resolves to a page that exists at write time, or is
itself a scrub:

| Site | Writer | Resolves to |
|---|---|---|
| local birth (2184) | `base.pg=state.curPg` | the viewed page |
| `_pgHome` (2223) | `s.pg=state.curPg` / `delete s.pg` | viewed page / fallback |
| `_pgDup` (2258+) | `c.pg=id` | the page the dup just created |
| `_pgDel2` (2289) | `s.pg=firstId` | rehome target (pg0/head) |
| pageAdd fwd (1806+) | `c2.pg=op.id` | the page being added |
| first-page bootstrap (1802) | `s.pg=op.id` | the first page |
| drawio import (7249) | `s.pg=id` | each diagram page |
| pages-null tails (1815/1836) | `s.pg=null` | scrub → `_pgOk` fallback |

The two heals cover everything outside this table: `_pgHeal` runs per-member
at op intake (stub or scrub — ADR-1175), `_pgHealS` sweeps after every
wholesale page-set change (`_pgAdopt`, pages-null tails).

The last unpinned fork: op-intake with a full page set (64 pages) — the `'?'`
stub is cap-blocked, so `_pgHeal` scrubs `s.pg` and the member rehomes to
`pages[0]` via the `_pgOk` fallback. No writer produces a dead `pg`; the
funnel is closed.

## Pins
- 4 behavioural: a cap-blocked op-carried member installs, `pg` is scrubbed,
  no `'?'` stub appears past the 64-page cap, and the member stays `_pgOk`
  on `pages[0]`.
- 2 source: the `s.pg=` assignment census is exactly six sites, and local
  births still stamp the viewed page.
