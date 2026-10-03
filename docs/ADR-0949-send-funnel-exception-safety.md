# ADR-0949: Send-funnel exception safety audit

## Status

Accepted (2026-10-01)

## Context

`Net.broadcast(op)` runs inside `Store.commit`'s apply path *after* the local
mutation has already landed (`_apply` at ~1443, plus undo/redo at ~1580/1594/1606).
A synchronous throw escaping the outbound path would poison the commit stack —
local state applied, peers never told, and the exception surfacing inside a caller
that never expected network code to throw. This audit verified that every send
funnel swallows transport errors instead of propagating them.

## Decision — every funnel is guarded; pinned

Outbound transport sinks, verified in source and exercised in test.mjs:

- `Net._send(msg)` — the only `bc.postMessage` site; wrapped in `try{}catch{}`.
- `Net._sendDC(m)` — the only `dc.send` site; `try` catch seeds `this._dcQ` and
  arms `bufferedAmountLowThreshold`/`onbufferedamountlow` retry (ADR-0432),
  drops `>262144` first (ADR-0438), caps the backlog at 4096 msgs / 32MB
  (ADR-0783). Messages serialize *before* `_sendDC` is called, inside
  `broadcast`'s own `try` (`_JS({k:'op',...})` at 8112).
- `Net._fragSend` — chunked snapshot/op path funnels into `_sendDC`.
- `Net._bcast` — presence/img/docName fan-out = `_send` + `_sendDC(_JS(msg))`;
  `_JS` can only see `_mk`-produced plain objects (no BigInt/cycles).
- `Net._slimOp` — pure projection; the only unguarded piece of `broadcast`,
  and it cannot throw on a locally produced op.

Same-round clean audits (no defect found):

- Presence `peer.pg` — cursor skip-gate `p.pg!==state.curPg` (2813); avatar
  tooltip/follow gated by `_pgById(p.pg)` (9261); `msg.pg` capped `_s0(,64)`.
- `_imgPending` — `_park` caps at 256 entries with oldest-eviction (2205),
  entries dropped after 60s (8020), imgq answers throttled 10s/key (8205).

## Consequences

`broadcast`/`_bcast`/`_send`/`_sendDC` can never propagate a transport error into
a commit path: worst case a throw lands a message in `_dcQ` for the low-water
retry, and unreachable-cap sends are dropped. Four behavioural pins lock the
contract (`_sendDC` swallows a throwing `dc.send`, queues it; `_bcast` delivers
to a live channel and leaves no backlog). Assert count 3036 → 3040. Note: the
two-peer harness permanently replaces `Net.broadcast`/`Net._send` on the main
sandbox, so the pins exercise the real funnels (`_sendDC`, `_bcast`) directly.
