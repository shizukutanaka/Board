# ADR-0905 — IndexedDB intake audit complete

## Status

Accepted — audit round, no code change. Records the verified gates on the
persistence read paths so future changes can be checked against them.
Complements ADR-0904 (localStorage boot values).

## Threat model

IDB records are same-origin, app-written data — lower exposure than the wire
— but they are also user/devtools-writable and long-lived across deploys, so
the read paths hold them to the same intake posture.

## Verified gates

| Field | Path | Gate |
|---|---|---|
| `d.shapes` | `Persist.load`, `restoreBackup`, `checkBackup` | `validShape` per element (`_rs` only sees filtered shapes) |
| `d.shapes[].img` | both load paths | `_imgAttach` → `Net._attachShape` parks missing refs into bounded `_imgPending` (ADR-0835 waitlist cap), blob keys content-addressed |
| `d.pages` / `d.curPg` | both load paths | `_pgAdopt` → `_vPages`: ≤64 pages, id ≤64, name ≤80, `nts` `_tsOK`, `ntp` ≤64; `curPg` resolves via `_pgById` or falls back to first page |
| `d.viewport` | both load paths | `_vpOK` center bound + `clampZoom` |
| `d.docName` | both load paths | `_docN` → `_s80` |
| `d.wc` (wclock) | `Persist.load` | per-entry `validClock`; `state.wclock` is null-proto (ADR-0788) so `__proto__` keys land harmlessly as own slots |
| `d.rep` / `d.nts` / `d.ntp` | `Persist.load` | `validClock`, `_tsOK` (wall+5min bound), `_idOK` |
| `d.savedAt` | `Persist.load` | `d.savedAt||0` numeric fallback |
| `checkBackup` offer | boot prompt | only offered when ≥1 shape survives `validShape` — a fully-corrupt `:prev` is never surfaced |

## Non-issues confirmed

- `_attachShape` runs before `validShape` on both paths, but its only side
  effect is a bounded `_park` waitlist entry keyed on `s.id`; entries expire
  and the list is capped.
- No `SHARE_MAX_SHAPES` cap on the load count — by design: the share cap
  bounds transfer payloads, not the local board a user authored.
- `restoreBackup` resets `state.wclock` to a fresh null-proto map rather
  than merging the backup's clocks — tombstones don't resurrect.

## References

ADR-0004 (backup slot), ADR-0031 (blob store), ADR-0646 (pages),
ADR-0788 (null-proto wclock), ADR-0904 (localStorage gates).
