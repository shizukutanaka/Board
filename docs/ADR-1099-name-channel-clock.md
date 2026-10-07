# ADR-1099 — wire `name` requires a writer clock; `change`-only doc-name edits broadcast

Date: 2026-10-01 (round849)
Status: accepted (shipped in v1.8.123)

## Context

`state.docName` is a (ts, peer) LWW register: `_bName` stamps
`_nameTs=nowTs();_namePeer=_pi()` and broadcasts `_mk('name',{name,ts})`
(index:915); the snapshot channel carries `name/nameTs/namePeer` (:8409) and
arbitrates via `_nameWin` — the same total order on both channels since
ADR-0699/0618/1091/1092. The audit this round asked whether every intake and
every local producer of the name channel honours that contract.

## Findings (two gaps, both closed)

1. **`case 'name'` (:8365) adopted a clockless message unconditionally.**
   The guard was `(_iN(msg.ts) ? _tsOK(msg.ts)&&_nameWin(...) : !0)` — when
   `msg.ts` wasn't a number, the name landed unconditionally. Every legitimate
   producer stamps `ts`, so a clockless `name` can only be forged: a
   room member could overwrite any docName arbitrarily, and since `_nameTs`
   isn't advanced on a clockless adopt, subsequent real renames arbitrated
   against a stale clock. The guard now requires
   `_iN(msg.ts)&&_tsOK(msg.ts)&&_nameWin(msg.ts, peer)` — the same
   writer-clock discipline as the op `before` baselines (ADR-1086/1087/1088):
   under-specified wire payloads are rejected, not interpreted. On adoption
   the `(ts, peer)` pair is stamped together (writer-normalized, ADR-1092).

2. **The `change` handler committed without stamping or broadcasting.**
   `input`/`compositionend` route through `_commitDocName` (ro-gate →
   `_setDocName` → `_md(!0)` → `_ps()` → `_bName`), but the `change` handler
   only did `_setDocName + _ps()`. A field change that reaches `change`
   without an `input` event (assistive tech, a composition-cancel edge) would
   land locally while peers never learned it and `_nameTs` stayed stale —
   the LWW register then arbitrated the *new* name under the *old* clock.
   The handler now funnels through `_commitDocName` gated on
   `docNameEl.value!==_dn()`: an unchanged `change` (the common case — every
   user edit already committed via `input`) is a no-op and rebroadcasts
   nothing.

## Coverage notes (audited, clean)

- `_docN` (IDB-load/:prev) sets `state.docName` without stamping; the IDB
  restore site re-installs `d.nts`/`d.ntp` immediately after (:8922), keeping
  the pair, and both import sites (`importBoard` :7673, share import :8772,
  `restoreBackup` :8985) call `_bName()` right after — stamping a fresh local
  writer clock for the adopted name.
- Every swap path records via `_repC` (including `restoreBackup` :8990), so
  `_lastRep` stays the causal marker for arbitration.
- `input`/`compositionend`/`blur` handlers are consistent: `blur` resets the
  display to `_dn()` (ADR-0609) — display-only, correctly clockless.
- `_setDocName` intentionally stamps nothing: the *callers* own clock
  semantics, which is what this round fixes at the last two sites.

## Behavioural pins (test.mjs)

- `k:'name'` with no `ts` → rejected.
- `k:'name'` with non-numeric `ts` → rejected.
- valid `(ts,peer)` name → lands and stamps the writer pair.
- older-ts rename → loses the arbitration.
- far-future `ts` → rejected by `_tsOK`.
- `change` event with a diverged field value → commits through the shared
  funnel (stamps + broadcasts).
- `change` event with an unchanged value → no-op, zero broadcasts.
