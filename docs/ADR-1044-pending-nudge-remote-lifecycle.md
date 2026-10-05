# ADR-1044: pending-nudge × cross-path lifecycle — flush coverage audit

## Status

Accepted (v1.8.070). Clean — no divergence found; contract pinned.

## Scope

`_nug` is the 400ms trailing-edge coalescer for held-key sessions (move nudge,
zorder, style, group, align variants, resize). A live mutation applies
immediately while the op itself stays uncommitted — the audit asks: can any
mutation path cross a pending `_nug` without either flushing it first or
folding into its restore domains, in a way that corrupts ordering, `before`
snapshots, or convergence?

## Coverage matrix

| Path | Mechanism | Verdict |
|---|---|---|
| `Store.commit` (1420) | `_nugEnd()` first | flush-first ✓ |
| `Store._recordCommitted` (1564) | `_nugEnd()` first — covers every `_rcOp` bypass (ungroup/beautify/`_repC`) | flush-first ✓ |
| `Store.undo`/`redo` (1582/1599) | `_nugEnd()` first — undo pops the just-committed run | flush-first ✓ |
| `switchPage` (2106) | `_nugEnd()` + `_cxO` + gesture cancel | flush-first ✓ |
| visibilitychange/pagehide/beforeunload (8844–8851) | `_nugEnd()` + `_cxO` | flush-first ✓ |
| `Store.applyRemote` (remote ops) | no flush — instead `_oa`→`_gTouch` folds the remote write into `n.op.orig`/`before`/`changes`, and `_bT` marks `n.reborn` on remote re-births | fold ✓ |
| `_applySnapshot` | gated `_nS()===0` — a pending nudge needs live members, so adopt-on-empty cannot collide; same-id merges go through `_oa`→`_gTouch` | unreachable/fold ✓ |
| Wholesale local swaps (import/clear/restore) | route through `Store.commit`/`_recordCommitted` → flush-first | covered ✓ |
| `Net.init` room switch | `Net.init(` appears exactly once (boot) — `DOC_KEY` is fixed, no runtime room switch exists | unreachable ✓ |
| Timer expiry mid-gesture | `_keepSel(n.sel)` + locked/missing partition (`_nugLock`) at commit | self-coherent ✓ |

## Two remote-cross edges, pinned

1. **`_gTouch` fold** (0971): a remote write mid-run copies the live value into
   the pending op's restore domains. On a locked-member flush, `_nugLock`'s
   `_geoR` revert restores run-start geometry *but keeps the folded remote
   write* — without the fold the revert would clobber it.
2. **`n.reborn` exclusion** (0984): a swap that replaces a member object under
   the same id marks the id in `n.reborn`; `_nugLock` drops it, so the stale
   local delta never rides the adopted object.

New-coalescer contract for future `_nug` kinds: any producer must (a) live-
mutate before pushing, (b) supply absolute restore domains (`orig`/`before`),
(c) tolerate `_nugLock` partition, (d) never commit through a path that skips
`_recordCommitted`.

## Verified

`node test.mjs`: 3591 pass, 0 fail (7 new pins).
