# ADR-1030: Join-handshake × room-switch + restore-path lifecycle audit (clean)

## Status

Accepted — audit complete; contract pinned. No divergence found.

## Context

Round779 (おまかせ improvement loop). The join handshake keeps several
in-flight artifacts alive across time: the `sync-req` bounded resend
(`_snapRetry`, ADR-0475), the throttled deferred snapshot resend (`_snapT`,
ADR-0452), and inbound `snap`/`opc` reassembly slots (`_snapIn`/`_opcIn`,
ADR-0466). A **mid-flight room switch** could carry a stale retry timer, a
pending resend, or a half-assembled stream into the new room — a wedge class
(new-room sync-req never re-sent, wrong peer's fragments spliced in). A second
axis covered the only other "adopted board" path that bypasses `_cmt`:
`restoreBackup` — if it skipped the commit funnel it would diverge (restored
locally, never broadcast/undoable). The original axis (selection×`_pgHealS`)
was judged clean by analysis: dead-pg shapes are off-page both before and
after the '?' stub heal, and `delete s.pg` only runs when the page set is
already null.

## Audit table

| Surface | Mechanism | Verdict |
|---|---|---|
| sync-req retry counter | `Net.init` → `_snapRx=false;this._snapRetry=0` | clean |
| throttled snapshot resend | `Net.init` → `_cT(this._snapT);this._snapT=0;this._lastSnapAt=0` | clean |
| inbound reassembly | `Net.init` → `_snapIn=null;_opcIn=null` (0466) | clean |
| img transfer state | `Net.init` → `_imgSent/_imgChunks/_imgOuts/_imgqT` reset (0464/0836) | clean |
| presence rows | non-`rtc:` ids swept; `_pCt` rebased (0458/0467) | clean |
| heartbeat | `clearInterval(_presenceTimer)` → re-armed | clean |
| rtc link + causal markers | closed/reset **only** when `state.roomId!==newRoom` (0619/0695/0839) — same-room re-init correctly preserves them | clean |
| `_imgPending` parked refs | survives init — content-addressed, doc-scoped (1023) | clean |
| `restoreBackup` | runs before `Net.init` in `main()` (no peers exist); commits via `_repC` as a real `replace` op → undo + `Net.broadcast` + `_bT` born stamps all ride; `:prev` discarded on success; `backupRestoreFailed` toast on throw (1028) | clean |
| op send funnel | every op → `Net.broadcast` → `_slimOp` → `_mk('op')` → BC + DC (frag >200KB); `_bcast` reserved for non-op kinds (hello/ping/cursor/selection/name/imgq/img) | clean |
| broadcast-only ops | `_syncTextFinalize` stamps `_wD` tomb (0991) or `_stampWrites` before `Net.broadcast` — peers' wclock parity held | clean |
| structural-key producer path | `s.pg` mutations reach the wire only as members of `pageAdd`/`pageDel`-family ops (carried shapes) or via `_pgDel2` rehome applied identically on both sides; never inside per-prop patches (strip `_stripStruct`) | clean |

## Contract

- **A new room-scoped buffer/timer/lifecycle slot must be reset in
  `Net.init`'s reset block** (the run of statements before
  `new BroadcastChannel`). Doc-scoped (`wclock`), boot-scoped
  (`seq`/peerId), and content-addressed (`_imgPending`) state must NOT be
  reset there.
- **A new wholesale "adopt a doc" path must commit via `_repC`** (or the
  equivalent `replace` commit) so undo, broadcast, tomb/born stamps, and the
  `:prev` backup contract all engage — never a bare `_rs`.
- **A new op send must go through `Net.broadcast`** (the `_slimOp`+envelope
  funnel); `_bcast` is for non-op wire kinds only.
- **Causal markers may only reset on a real room change** — same-room
  re-init must preserve them and the rtc link.

## Pins (test.mjs, 8 asserts)

1. Source pin: init resets deferred-snapshot + retry machinery.
2. Source pin: init resets inbound reassembly slots.
3. Source pin: `restoreBackup` commits via `_repC`.
4. Source pin: broadcast funnels through `_slimOp`.
5. Behavioural: `_snapT` canceled across a switch.
6. Behavioural: `_snapRetry` resets across a switch.
7. Behavioural: `_snapIn`/`_opcIn` reset across a switch.
8. Behavioural: `state._lastRep` reset on a real room change.

## Residuals (accepted)

- A *failed* remote apply leaves no per-room resend state to reset (1026's
  dedup eviction handles it) — no timer needed.
- `state.wclock=_wM()` wipe inside `restoreBackup` intentionally drops write
  clocks; restored shapes get fresh `_born` stamps via the `replace` commit —
  peer-side newer writes still win per-prop LWW, by design.
