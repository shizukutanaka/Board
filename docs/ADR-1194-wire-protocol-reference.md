# ADR-1194: Wire protocol reference — the normative kind × transport × bounds contract

- Status: Accepted (round944, ADR-1048 P4)
- Date: 2026-10-01
- Version: 1.8.218

## Context

ADR-1048's residual P4 asked for a single JSDoc-style description of the wire
types. The rules already exist — scattered across ~40 ADRs and enforced by
`_onRecv`'s dispatch — but there was no normative list of every envelope kind,
its transports, its authenticated fields, and its bounds. This ADR is that
reference. The pinned drift gate in test.mjs keeps it honest: every dispatched
kind and every emitted `_mk` kind must appear here.

## Envelope & authentication (ADR-1056/1098/1193)

- Every message is a plain object. `_canon(m)` serializes `{...m}` minus
  `mac`/`dmac`/`data`; `_mac`=`_hmac(_sec(), canon)`, `_dmac`=`_hmac(_dcKey||_sec(), canon)`.
- `_send(msg)` (BroadcastChannel) stamps `mac` if absent (idempotent).
- `_bcast(msg)` = `_send` + stamps `dmac` if absent + `_sendDC(_JS(msg))` — one
  object carries both tags so either transport verifies.
- `_sendDC` is the only `dc.send` funnel: `>262144` chars dropped; backpressure
  queue ≤4096 messages and ≤33554432 bytes; `onbufferedamountlow` drains the
  queue then `_flushFragOuts`/`_flushImgOuts`.
- Verify on intake: `viaRtc` ⇒ `dmac`, else `mac`; constant-time `_eqs`;
  `msg.peer` must be a string ≤`MAX_PEER_ID_LEN`(64) and an `rtc:`-prefixed id
  is rejected off-RTC (ADR-0827); self-peer and non-objects dropped first.
- `data` is canon-excluded because only chunk envelopes carry it, and its
  integrity is re-established downstream: `snap`/`opc` re-enter `_onRecv` so the
  inner message's tag is re-verified (ADR-0987); `img` payloads verify
  `_imgHash(data)===key` content-address (ADR-0864).
- `viaRtc` drops `hello`/`ping`/`sync-req` — BC-only kinds (ADR-0986).

## Kind × transport × payload contract

| kind | transport | sender sites | fields & bounds | intake effect |
|---|---|---|---|---|
| `hello` | BC only | `Net.init`, room switch re-announce | `peer` | touchPeer; `_loResp` winner sends snapshot |
| `ping` | BC only | periodic announce (`_send`) | `peer`, `n` (≤24 via `_nIn`) | touchPeer + name update |
| `sync-req` | BC only | join + bounded resend (ADR-0475) | `peer`, `wc` (horizon) | touchPeer; `_loResp` → `_sendSnapshot(_reqWc)` |
| `cursor` | both | `sendCursorMoved` (throttled) | `x`,`y` finite & ≤1e7 (`_xyOK`), `h`, `pg` ≤64, `n` | peer row cursor/pg/name; `h:1` clears |
| `selection` | both | `sendSelectionIfChanged` | `ids` ≤MAX_OP_SHAPES, each `_idOK`; `pg` ≤64; `n` | peer row sel/pg/name; dead ids filtered |
| `bye` | both | room switch, pagehide | `peer` | `_pk` row deleted; `_ivO` |
| `name` | both | `_bName` docName changes | `name` ≤80, `ts` `_tsOK`, `peer` | docName LWW (ts,peer) total order |
| `op` | both | `Net.broadcast(op)` | `op` via `_attachOp`; `op.clock.peer===msg.peer` | `Store.applyRemote` |
| `snapshot` | inner msg | `_sendSnapshot` → fragged | `name`/`nameTs`/`namePeer`, `rep` clock, `shapes` ≤SHARE_MAX_SHAPES, `ops`, `dels`, `pages` | `_applySnapshot` (empty) or merge ops ('add' only, envelope-bound clocks) + dels tombs + pages union-heal |
| `snap` | DC only | `_fragSend(_sm,'snap')` | `seq`,`n` ≤384, `data` ≤96KB | `_fragIn` → joined ≤24MB → re-enters `_onRecv` |
| `opc` | DC only | oversized `op` (>200000) via `_fragSend` | `seq`,`n` ≤384, `data` ≤96KB | same → inner `op` re-verified |
| `img` | both | `_flushImgOuts` | `key` ≤64, `data` ≤96KB, `n` ≤4096, `seq`<`n` | per-(key,sender) slot ≤64 entries, ≤12MB/stream, ≤24MB aggregate; joined verifies `_imgHash` |
| `imgq` | both | `_imgqSweep` | `key` `_idOK` | 10s/key throttle → `_imgOuts` staged answer or `_imgDbGet` |

`both` = rides `_bcast` (BC `mac` + DC `dmac`). `BC only` kinds are dropped when
they arrive via RTC (ADR-0986); `snap`/`opc` are dropped off-RTC (ADR-0987 —
a BC-forged chunk must not wedge the single reassembly slot).

## Op sub-ops (`REMOTE_OPS`, 17)

`add`, `addMany`, `del`, `upd`, `move`, `group`, `ungroup`, `zorder`, `align`,
`style`, `resize`, `replace`, `pageAdd`, `pageDel`, `pageName`, `beautify` —
plus `clear`, which is translated to `replace(after:[])` before broadcast
(ADR-0626). Each sub-op's field validation lives in `validWireOp`'s per-kind
clauses (ADR-0755/0777/0791/0793/0796/1086/1087/1088).

## Send-side lifecycle rules

- `_fragSend` pauses while `_dcQ` is congested (ADR-1061) and stages ≤64MiB via
  `_stgOK` (ADR-1062); `n>384` → `syncTooLarge` toast (ADR-0603).
- Reassembly slots: `snap`/`opc` single-slot per direction (`_snapIn`,`_opcIn`),
  restart on `n`/src mismatch or `seq===0`, 60s idle TTL (ADR-0786);
  `_imgChunks` per-(key,sender) ≤64 slots (ADR-1038).
- `img` answer staging dedups by key and respects the same congestion gates.

## Consequences

One table now states every kind's contract; a drift pin fails if the dispatch
switch or the send sites grow a kind the doc doesn't name. No behaviour change.
