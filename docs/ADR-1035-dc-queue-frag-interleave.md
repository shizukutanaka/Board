# ADR-1035: `_dcQ` backpressure queue × fragment-stream interleave — ordering audit

## Status

Accepted (v1.8.061). Clean — no divergence found; contract pinned.

## Context

`_sendDC` is the single SCTP funnel. When the buffer rejects a send, messages
queue FIFO in `this._dcQ` (caps: ≤4096 msgs / ≤32MB bytes, >262144 dropped,
ADR-0432/0438/0783). Question: while a fragment stream (a snapshot or a
chunked op, 64KiB chunks) sits in the queue, can another sender-generated
stream's chunks or plain messages interleave and break reassembly?

## Findings

| Surface | Verdict |
|---|---|
| `snap`/`opc` chunk intake | DC-only — `if(!viaRtc)break` (0987); BC-forged chunks can't wedge the slot |
| Queued non-frag message between chunks | inert — the receiver's switch only lets `snap`/`opc`/`img` touch a slot |
| Second same-sender stream overlapping | `n`-mismatch / `src`-mismatch / `seq===0` all restart the slot (0448/0469/0563); a same-`n`+`src` splice lands a joined blob that fails `JSON.parse` → dropped; `sync-req` retry (0475) + seq0 restart heals |
| `img` chunk intake | per-key slots, `st.n` restart, 64-slot LRU, 24MB aggregate, 12MB per-blob — and the join is `_imgHash`-verified against the key (0864), so interleaved chunks of the same key are byte-identical and forged bytes never land |
| `dc.onclose` | `_dcQ` + both slots cleared (0446/0448) — reconnect heals |
| Presence starvation | FIFO single queue; presence throttled at source; overflow drops are silent-by-design with snapshot heal as the backstop |

## Contract rule for new queued kinds

1. A fragment stream must be transport-bound (`viaRtc`-gated) if its slot is
   shared — BC and DC chunks must never interleave in one assembly slot.
2. Reassembly slots must be `(n, src)`-bound with `seq0` restart, and the
   joined payload must be self-validating (`JSON.parse` or content-hash).
3. Queued sends funnel through `_sendDC` so the 4096/32MB caps and the
   onclose reset apply uniformly.

## Pins (test.mjs)

- Source: DC-only gate; slot restart condition; `_dcQ` caps; img hash-verify.
- Behavioural: mid-stream buffer; seq0 restart; complete join `'AB'`; BC src
  opens its own slot (never splices); `n`/`src` mismatch restart; >96KiB
  chunk, `seq≥n`, `n>384` rejections.
