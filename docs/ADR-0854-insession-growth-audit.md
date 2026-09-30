# ADR-0854 — in-session growth-bounds audit + comment-repair sweep #4

## Context

Prior rounds bounded every wire-intake structure (seenOps ≤2000 via `_trimSeen`,
history ≤500, pages ≤64, peers ≤MAX_PEERS+reaper, img/frag reassembly by bytes+TTL,
`_dcQ` ≤32MB, wclock flood cap). This round audits the remaining axis: state that
grows *during* a session independent of the wire — undo stack, memoization caches,
transient DOM (toasts), timers.

## Audit result — all bounded

| Structure | Bound |
|---|---|
| `state.history` | `MAX_HISTORY=500` enforced in `commit()` |
| `seenOps` | `MAX_SEEN_OPS=2000` via `_trimSeen` |
| `state.pages` | ≤64 (`_vPages`/`pgMax`) |
| `peers` | `MAX_PEERS` + idle reaper (`_touchPeer`/`_reapPeers`) |
| toasts | auto-remove ~1.8s, identical re-append (ADR-0389) |
| `_dcQ` | 32MB byte cap |
| img stores | byte-bounded (`_imgIn` 64MB, `_imgSent` 64MB, slots TTL'd) |
| frag slots | TTL reaper (`_reapFrags`) |
| memo caches (`_penBboxCache`, `_wrapCache`, `_connLabelMeasure`, `_imgCache`, `_haloMap`, `_matchList`) | keyed by live shape ids; `_psc` purged on every removal path |

No unbounded accumulator found — no code change on this axis.

## Comment-repair sweep #4

Continuation of ADR-0847/0849/0851: ~20 further severed fragments repaired
(`hit()` quick-reject/rotation blocks, `_onRecv` peer-id intake, `withFrameChildren`,
`tidy`/`swap` unit comments, ⇧+wheel, cursor `_lastSelSent` dedup, `_rtcPeerId`
routing, `requestDurable`, RTC copy buttons, minimap persist, `_pgDel2` firstId,
JSON-safe `before`, SVG frame parity). Repairs rewrite blocks to ≤ their current
byte cost rather than restoring the lost text verbatim, keeping the raw ceiling.

## Status

Accepted — audit complete on this axis, comment integrity restored file-wide
(paren-truncation and mid-word scans now clean).
