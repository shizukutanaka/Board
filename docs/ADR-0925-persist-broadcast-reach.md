# ADR-0925: persist & broadcast reach audit complete

## Status

Accepted (2026-10-01)

## Context

A state mutation that never reaches `Persist.schedule()` (`_ps`) is lost on
reload; one that never reaches `Net.broadcast` diverges from peers. After the
ADR-0916–0924 backward-apply cluster closed the last known apply-side gaps,
the remaining systemic question was whether every mutation entry point still
arrives at both sinks — including wholesale swaps (`_rs`/`_pgAdopt`) that
bypass the op path entirely.

## Decision

Record the verified-clean result; no code change. `v1.7.951`.

## Audit matrix

| Entry point | Persist (`_ps`) | Broadcast | Path |
|---|---|---|---|
| `Store.commit` | `_rdb()` | `peer===_pi()` gate → `broadcast` | normal ops |
| `Store._recordCommitted` | `_rdb()` | `broadcast` | `_rcOp`/`_repC`/ungroup/align/beautify commits |
| `Store.applyRemote` | `_rdb()` | n/a (inbound) | `REMOTE_OPS` whitelist + `validRemotePayload` |
| `undo`/`redo` | `_rdb()` | undo-wire ops + restamped op | histIdx bookkeeping + `_pgFollow` |
| `_applySnapshot` (wire) | `_iv();_ru();_ps()` | n/a | `snap`/`snapBig` reassembly |
| File/board import | `_repC` → `_rdb()` | via committed `replace` op | `_rs` + `_pgAdopt` + `saveBackup` first |
| Share-link adopt (`#b=`) | explicit `_ps()` | via committed `replace` op | `_rs` + `_pgAdopt` + `saveBackup` |
| Backup restore | `_repC` → `_rdb()` | via committed `replace` op | same wholesale-swap pattern |
| `switchPage`/`_pgAdopt` | `_ps()` | cursorHide ordering (0690/0689) | page transitions |
| docName rename | `_ps()` | `_bcast('name')` | input commit + remote adopt |

Auxiliary checks: `_attachOp` img-ref parking feeds the same wholesale paths;
`_sendDC`/`_fragSend` ordering and caps were already closed in ADR-0431/0432/
0438/0783/0838; `REMOTE_OPS` (16 wire ops) matches the broadcastable alphabet
— `clear` is translated to `replace` outbound (ADR-0626).

## Consequences

- Mutation-sink reachability is now a documented invariant: every path that
  changes persisted state schedules a save; every path that changes shared
  state emits on the wire.
- `pass += 1888` unchanged (no code, no new asserts).

## References

- ADR-0819 — storage/quota/img-queue lifecycle (sink internals).
- ADR-0918 — forward apply-side audit.
- ADR-0924 — backward apply-side audit (companion piece).
