# ADR-1031: Presence-channel send-signature × lifecycle audit (clean)

## Status

Accepted — audit complete; contract pinned. No divergence found.

## Context

Round780 (おまかせ improvement loop). Presence traffic (cursor, selection,
peer count) is deduplicated by send-side signature keys. If a signature key
survives a room switch it can suppress the first legitimate send in the new
room — a "peer never sees my cursor/selection" residual. The audit covered
every send-side dedup/signature in the presence channel plus the related
undo×swap ordering edge.

## Audit table

| Key / mechanism | Lifecycle | Verdict |
|---|---|---|
| `_lastSelSent` (selection dedup) | `_touchPeer`'s new-peer branch sets it `null` — every peer in a new room is new to us, so the first peer's hello/ping forces a resend on the next `sendSelectionIfChanged` (called per frame). Empty new room → no audience, nothing lost | clean |
| selection key contents | `_JS(ids.sort())+'|'+(state.curPg||'')` — the viewed page rides the key, so a page switch always resends (0680) | clean |
| `_lastCursorSend` | at most one `CURSOR_THROTTLE_MS` window of stale throttle in a new room; `sendCursorHide` resets it to `0` (0611/0689) | clean |
| `_selSig` (style-panel dedup) | local UI signature only — recompares each frame against the live selection | clean |
| `Net._pCt` (join/leave SR baseline) | rebased by `Net.init` to `_pr().size` after the non-`rtc:` sweep (0467) | clean |
| `_imgIn` received-blob store | survives `Net.init` — content-addressed, doc-scoped, same class as `_imgPending` (1023) | clean |
| `_dcQ` ordering under reconnect | FIFO + `_dcQB` byte accounting; ops clock-arbitrated → arrival order irrelevant (0816/1018) | clean |
| undo × wholesale swap | remote swaps are not in local history; undo of a pre-swap op is a deterministic no-op or symmetric tomb on both sides (0993) | clean |
| `_touchPeer` new-peer `_lastSelSent=null` | also fires for same-room re-learned peers after the init sweep | clean |

## Contract

- **A new presence dedup key must self-correct** without an explicit
  `Net.init` reset — either reset it inside `init` (documented in ADR-1030's
  rule), or make it re-derive on peer-set change like `_lastSelSent` does
  via `_touchPeer`.
- **Anything that names the viewed page must carry `curPg` in its signature**
  — page-scoped presence silently misses a resend otherwise.
- **Content-addressed stores (`_imgIn`, `_imgPending`) are doc-scoped** —
  they must NOT be reset on a room switch.

## Pins (test.mjs, 7 asserts)

1. Source pin: selection presence key carries `curPg`.
2. Source pin: `_touchPeer` force-nulls `_lastSelSent`.
3. Source pin: `Net.init` rebases `_pCt`.
4. Source pin: cursor throttle gate present.
5. Behavioural: `_touchPeer` nulls a stale `_lastSelSent`.
6. Behavioural: `sendSelectionIfChanged` emits after the forced null.
7. Behavioural: end-to-end resend path verified via `_bcast` capture.

## Residuals (accepted)

- Up to `CURSOR_THROTTLE_MS` of suppressed cursor updates immediately after a
  room switch — sub-second, self-corrects on next move.
- A selection signature identical across rooms still resends via the
  `_touchPeer` path — the extra broadcast is one small message per join, by
  design.
