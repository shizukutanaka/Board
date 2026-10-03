# ADR-0955 — derived-state identity hygiene: every reference is id-keyed

## Status
Accepted — 2026-10-01 (round704, audit complete + contract pin)

## Context
Wholesale ops (`'replace'` forward, `_rs` snapshot adopt, `_pgDel2` member
kill/rehome) swap scene objects wholesale: `state.shapes` is rebuilt and the
surviving entries are *different object identities* (clones from `op.after` /
the wire), not the old in-place objects.

Any derived/reference state that held a *raw object pointer* into the old scene
would silently dangle — the classic "stale clone" defect class behind the
0952/0953 erase-batch work. round704 audited every derived-reference site for
object-vs-id resolution.

## Audit — all references are id-keyed

| reference | stored as | resolution | result |
|---|---|---|---|
| `state.selection` | `Set<id>` | `byId` at `_ss`/`_selIds` consumers; `_sdl` at kills (0954) | clean |
| `state.editing` | `s.id` | `byId(_ed())` in `_teFollow`; blur-commit `!byId` guard | clean |
| `state.bindPreview` | shape id | `byId(state.bindPreview)` each frame (:2761) | clean |
| `ptr.gAnc` / `ptr.gOrig` | `Map<id,clone>` | id-keyed restore patches land via `byId` on the new object | clean |
| `connEnds` (s.a/s.b) | shape ids | `byId` per call — endpoints follow the swapped clone | clean |
| presence `sel`/`cur`/`pg` | ids/coords | draw resolves `byId` → dead ids skip | clean |
| `_eraseBatch` | clones | `_unB`/`_rs` drop or unbatch (0952/0953) | clean |
| `s._img` parked ref | on-object | `clone()` drops it; re-resolved from blob store (0551/0745) | clean |
| `s.frame` | spatial | recomputed via `_frameOf` — never a stored ref | clean |

Non-issues by construction: marquee/lasso/measure/guides are coordinate
tuples; `_idIndex`/`_imgPending`/`_imgC`/`_snapIndex` are rebuilt or keyed on
`_gridVer`/img-fingerprint rather than object identity.

## Decision
Contract pin: after a remote `'replace'` swaps the scene, a connector bound to
a surviving id re-resolves against the NEW object — `connEnds` returns the
moved endpoint, proving id-keyed resolution (not stale-object aliasing).
No code change: the contract was already uniformly held; this ADR + pin make it
a checked invariant so a future reference type introduced as an object pointer
fails the pin/audit instead of shipping a stale-clone bug.

## Consequences
- `test.mjs`: 2 pins — object identity swaps on `'replace'`; `connEnds`
  endpoint follows the swapped object by id.
- Rule of record for new derived state: store the **id**, resolve via `byId`
  at use time; object caches must key on `_gridVer` or be dropped by `clone()`.
