# ADR-0937 — Hot-path work bound audit — completion record

Status: audit complete (docs only, v1.7.963)
Date: 2026-10-01

## Context

ADR-0869 bounded every session-accumulating *structure*. The twin axis is
per-frame / per-input-event *work*: a computation that rescans O(n) shapes
or re-measures every frame/event is a standing cost even when nothing is
stored. This round audited every hot path for a memo, throttle, dedup, or
bound.

## Findings — all hot paths bounded (no defects)

| Path | Guard |
|---|---|
| `draw()` scene pass | `_lastVp` pan pixel-blit (0028), pinch snapshot (0030), `_damage` union rects (0026/0027) — full rescans only on real change |
| `drawOverlay()` | `_grpMap` (0047) and `_sqMatches` (0048) keyed on `_gridVer`/query — no per-frame rescan |
| `sortZ()` | called only on mutation/commit paths, never in draw() |
| `wrapTextCached` / `_clCache` label measure | WeakMap per shape, key covers text+font+spacing (0850) |
| `_penCache` bitmaps | `PEN_CACHE_MAX_PX=12e6` LRU + `_psc` per-id purge + `_tTk` theme flush |
| `_imgCache` | `IMG_CACHE_MAX=60` LRU |
| cursor presence | `CURSOR_THROTTLE_MS=60` (~16/s) + peers-empty early-out |
| selection presence | `_lastSelSent` serialized dedup key (incl. curPg, 0680) |
| `_sendDC` | 256KB per-message drop, 4096-msg/32MB queue cap (0438/0783) |
| key-repeat nudge/resize | one op per press by design — each repeat is a discrete undo step (Figma/Excalidraw parity); `MAX_HISTORY=500` bounds churn; wire 'move' carries absolute positions (0741) so replay converges |
| `describeShape` | content quoted at 30 chars — SR announce bounded |
| `s.font` → `ctx.font` | enum selector ('mono'/'serif'/default stack) — the remote string is never interpolated into the font shorthand, so a bogus value degrades to the system stack instead of leaking the previous shape's font (the 0868/0870 color-leak class, absent here) |
| `seenOps` | `MAX_SEEN_OPS` + 20% trim |
| `history` | `MAX_HISTORY=500` |
| `state.peers` | `MAX_PEERS=32` + 15s reap + rtc lifecycle + bye + room purge |

## Consequence

- Hot-path axis closed: every per-frame or per-event cost is memoized,
  throttled, deduplicated, or design-bounded. Audit completes as docs-only.
