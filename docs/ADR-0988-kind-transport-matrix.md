# ADR-0988: kind × transport matrix — audit complete

## Status

Accepted, implemented (round737 — docs + pin).

## Context

Two transports feed `Net._onRecv(msg, viaRtc)`: the BroadcastChannel (same
room, same-browser peers) and the WebRTC DataChannel (one manual-signaled
peer). ADR-0986 and ADR-0987 closed the two asymmetric gaps; this audit
swept every remaining `msg.k` kind for transport mismatches — a kind
accepted on a transport its senders never use, or a send path missing a
legit transport.

## Matrix (send → legit intake)

| kind | send path(s) | BC | DC | note |
|------|--------------|----|----|------|
| `hello` | `_send` | ✓ | reject | ADR-0986 early gate |
| `ping` | `_send` | ✓ | reject | ADR-0986 early gate |
| `sync-req` | `_send` | ✓ | reject | ADR-0986 early gate |
| `snap`/`opc` | `_fragSend`/`_sendDC` | reject | ✓ | ADR-0987 gate (slot wedge) |
| `op` | `_send` + `_sendDC`/`_fragSend` | ✓ | ✓ | clock.peer↔envelope bound (0931) |
| `cursor`/`selection` | `_bcast` | ✓ | ✓ | `_pk` routes DC msgs to `_rtcPeerId`; viaRtc resurrects the row (0986) |
| `bye` | `_send` (room switch) + `_bcast` (pagehide) | ✓ | ✓ | dual-path legit — onclose owns `_rtcPeerId` |
| `img`/`imgq` | `_bcast` | ✓ | ✓ | chunk answer + parked-ref re-request |
| `name` | `_bcast` | ✓ | ✓ | (ts,peer) LWW; ts bounded (0791/0701) |
| `snapshot` | `_send` (whole) — DC equivalent is `snap` frags | ✓ | ✓ | equivalence: a DC `snapshot` grants only what `snap` already has |
| unknown kinds | — | ignored | ignored | `switch` default |

## Findings — clean

- **Partial fan-out**: `_send`/`_sendDC`/`_bcast` each swallow their own
  errors — one transport failing never aborts the other.
- **Selection resend on room switch**: `_lastSelSent` needs no init reset —
  `_touchPeer` nulls it on every new peer row, which is exactly the moment
  a resend matters (`_pr().size===0` gates sends anyway).
- **Reassembly/queue lifetimes**: `_snapIn`/`_opcIn`/`_dcQ`/`_imgChunks`
  clear on dc.onclose (0446/0448), room switch (0466), and superseded-
  channel handlers gate on `this.dc!==dcRef`/`this.rtc!==pcRef` (0822).
- **`_imgIn`/`_imgInB` accounting**: every set/delete adjusts bytes;
  `_imgIn`/`_imgPending` intentionally survive room switches (content-
  addressed blobs are room-independent).
- **seenOps clear on same-room re-init**: harmless — every op apply is
  idempotent on id/tomb/wclock independent of the dedup cache.
- **`name` LWW**: msg.peer theft is the documented self-consistent-forgery
  premise (0933) — no new capability.
- **`_imgqT`/`_imgOuts`**: `_imgqT` only grows on real keys (set inside the
  `d0` gate); `_imgOuts` drains same-tick and `_bcast` can't throw.

## Decision

Pin the dual-legit acceptance contract so a future gate can't regress
reachability: DC `cursor`/`selection`/`bye`/`name` and BC `bye`/`name`
each still process through the real `_onRecv` path.

## Consequence

The transport layer's kind contract is fully enumerated and pinned — 0986
(DC-forged BC-kinds), 0987 (BC-forged frag streams) + this matrix (the
accepted side).
