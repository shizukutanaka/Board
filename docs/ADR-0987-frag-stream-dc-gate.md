# ADR-0987: gate fragment streams to the datachannel

## Status

Accepted, implemented (round736).

## Context

`Net._fragIn` reassembles `'snap'` and `'opc'` fragment streams in a **single
slot per kind** (`_snapIn`/`_opcIn`). A chunk whose `src` tag or `n` mismatches
the parked assembly restarts the slot (ADR-0448/0469/0563).

The send side only ever produces fragment streams on the datachannel:
`_sendSnapshot`'s RTC path calls `_fragSend(_sm,'snap')` → `_sendDC`, and the
`broadcast` op path calls `_fragSend(_mo,'opc')`/`_sendDC`. Nothing sends
`snap`/`opc` over the BroadcastChannel — `src` was therefore always `'rtc'`
in practice.

## Defect

The intake accepted `snap`/`opc` chunks over BC too (`src=msg.peer`). A BC
peer dribbling one forged chunk per interval ping-pongs the single slot
against a real RTC stream: each side's next chunk restarts the slot before
it completes — **mutual wedge, neither stream ever joins**. The 60s
`_reapFrags` TTL does not help: the slot is being actively restarted, not
idling.

## Decision

- `case 'snap':case 'opc'` requires `viaRtc`; the `src` arg collapses to the
  constant `'rtc'` (viaRtc is already established before the case).
- `'snapshot'` (whole-msg, BC-only on send at `_sendSnapshot`) stays gated on
  both transports *by equivalence*: a forged DC `'snapshot'` grants the same
  apply semantics a legit `snap` stream already has — no new capability.
  The senders' `'img'` chunks ride `_bcast` (both transports) and stay open.
- Legacy builds never sent frags over BC, so no interop is lost.

## Consequence

BC peers can no longer wedge RTC reassembly; DC streams are the only source
of frag chunks, matching the wire contract ADR-0383/0431 established.

Pins at test.mjs (ADR-0987 block) + the 0972/0383/0431/0782 frag pins updated
to the `viaRtc` wire form — the contract legitimately changed, not a test
edit-to-pass.
