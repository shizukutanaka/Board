# ADR-1098 — egress auth coverage × `dels` existence-clock parity audit

Status: accepted (2026-10-01, round848)

## Context

ADR-1056 put an HMAC-SHA256 tag on every wire message — `mac` keys BC traffic
by the doc secret, `dmac` keys DC traffic by the RTC link key. Ingress verifies
through a single funnel; egress tags through several helpers added over time.
ADR-1055/1093 gave the snapshot `dels` map tomb-delta semantics on top of the
existence clocks (`_born`/`_del`) that ADR-1091–1097 hardened. This round audits
the two coverage questions that remained open:

1. Can any egress path reach a transport without its tag?
2. Does the `dels` channel honor the existence-clock contract on both ends?

## Egress coverage — clean

Every byte that leaves the box goes through exactly two funnels:

- **BC**: `_send(msg)` stamps `msg.mac` (once) before `bc.postMessage`. The post
  is a synchronous structured clone, so a later `dmac` set on the same object
  cannot leak into the BC copy.
- **DC**: `_sendDC(serialized)` — every producer serializes a tagged object:
  - `_bcast` sets `msg.dmac` before `_sendDC(_JS(msg))` (dual-transport kinds:
    op/cursor/selection/name/ping/bye/imgq/img chunks).
  - `broadcast(op)` tags `{k:'op',…}` via `_tagDc` before `_sendDC`/`_fragSend`.
  - `_flushFragOuts` tags every snap/opc chunk via `_tagDc`.
  - `_flushImgOuts` sends img chunks through `_bcast` (so both tags land).
  - `_sendSnapshot` tags the whole snapshot message via `_tagDc` before
    fragmenting; the reassembled inner tag then covers the full payload —
    outer chunk tags need not cover `data` (documented in ADR-1056).
  - `_dcQ` backpressure stores the already-serialized (already-tagged) string.

No untagged egress path exists. `_canon` strips `mac`/`dmac`/`data` before
hashing, so a tag computed for one transport never collides with the other and
bulk `data` bytes never poison the canonical form.

## `dels` parity — clean

- **Send** (`_snapshotMsg`): emits `dels[id]` only for asker-held ids whose
  stored tomb outranks the asker's horizon AND whose `_born` does not outrank
  the tomb (`!_bN(id,w._del)`) — a live id is never advertised as dead.
- **Receive** (`case 'snapshot'`): the tomb write itself is LWW-conditional
  (`clockNewer` against the existing `_del`); application honors
  `s.locked || !_tAlive(id)` so a locked shape survives and the `_born` escape
  keeps a reborn shape alive; the page-side splice is `!_bN`-gated (ADR-1093).
- **`_bT` stamp coverage**: every re-introduction site stamps `_born` —
  `replace` fwd, `add`/`addMany` undo, `del` fwd re-add, `clear` undo,
  `replace` undo born, `pageAdd` (page id + members), `_pgAdopt`, snapshot
  page union-heal — so no path re-creates an id without its existence clock.

## Decision

Audit-clean; pin the contracts in test.mjs (12 asserts):

1–2. `_bcast` BC copy carries `mac`; DC payload carries `dmac`.
3. Every snap fragment carries `dmac`.
4–5. Every img chunk carries `dmac` (DC) and `mac` (BC).
6. The canon ignores `mac`/`dmac` keys.
7. dels tomb older than `_born` leaves the live shape (receive born-escape).
8. dels tomb newer than `_born` kills the shape.
9. A locked shape survives dels (del parity).
10. An existing newer tomb is not clobbered by an older dels clock.
11. A live id (`_born` outranks `_del`) is not advertised in `dels`.
12. A plain dead tomb newer than the horizon is offered.

(Harness note: the two-world section leaves `Net._send`/`Net.broadcast` wired
as cross-world relays, so the block temporarily installs the canonical `:8250`
`_send` body — the real body is exercised by every caller above it — and stubs
`Net.bc`/`Net.dc` for capture, restoring all three on exit.)

## Consequences

The send/receive auth surface is now pinned end-to-end: any future send path
that forgets its tag fails loudly, and the `dels` channel's existence-clock
semantics cannot silently regress. No behavior change — pins and docs only.
