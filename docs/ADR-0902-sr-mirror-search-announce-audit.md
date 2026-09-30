# ADR-0902 — SR mirror / search / announce / status-bar audit complete

## Status

Accepted — audit round, no code change. This ADR records the verified invariants
so future changes to these surfaces can be checked against them.

## Audit surface

| Surface | Mechanism | Verified |
|---|---|---|
| DOM mirror (`#shapeMirrorList`) | Rebuilt only when `_gridVer` changes (`_mirrorVer` guard in the frame hook), never per-frame | Rebuild is O(page) only on real shape/page changes |
| Mirror membership | `_sh().filter(_pgOk)` — viewed page only (ADR-0646) | Off-page shapes never listed |
| Mirror cap | `MIRROR_MAX = 300`, trailing `N more` item keeps truncation explicit | Bounded DOM on huge boards |
| Mirror hidden entries | Listed and tagged `tagHidden` (ADR-0154); `_mirrorGo` selection passes `_sv` gate so hidden shapes select nothing but still centre + announce | Deliberate SR discoverability, not a leak into selection |
| Mirror navigation | `_mirrorGo` → `_ss([id])` + `_fitViewport` + `_ann(describeShape)` | Hidden/locked shapes safe by the selection chokepoint |
| Search match list | `_sqMatches` keyed on `{_gridVer, _sq}`; membership cannot change otherwise | Cache cannot go stale mid-gesture |
| Search scope | `_sv(s) && _pgOk(s)` — visible + viewed page; bound-endpoint label/text lookup for connectors (ADR-0381) | Off-page/hidden shapes unreachable via search |
| Search navigation | `_sqAdvance` wraps with modulo, resets index on query change (`lastQ`), selects + centres + announces `describeShape (i/N)` | Deterministic ordering, no stale-index |
| ⌘Enter select-all | `_ss(matchIds)` through the same chokepoint | Page-scope inherited |
| Announce channel | `UI.announce` writes to `#sr` aria-live; identical text re-announces via trailing space (a mutation is required to re-fire) | Re-announce idiom verified, textContent only (no markup injection) |
| Status bar | `_statusSel` signature-gated on `_selDimSig`; `sCount` reads viewed page (ADR-0669); `sVer` static; `setStatusXY` is a single textContent write | No unbounded per-frame DOM churn |

## Rules for future surfaces

- Any new SR-visible list must be keyed on a version counter (`_gridVer` or a
  dedicated sig), page-scoped via `_pgOk`, and visibly-capped like `MIRROR_MAX`.
- Any new selection-entry path must go through `_ss`/`_sad` so the
  `_sv`/`_pgOk` gates apply — never write `state.selection` directly.
- Announcements belong on `#sr` via `UI.announce`; re-announce needs a string
  mutation (the trailing-space idiom), and text must never be injected via
  innerHTML.

## References

ADR-0015, ADR-0037, ADR-0041, ADR-0048, ADR-0154, ADR-0164, ADR-0381, ADR-0568,
ADR-0646, ADR-0669.
