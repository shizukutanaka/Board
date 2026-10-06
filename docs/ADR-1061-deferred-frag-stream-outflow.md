# ADR-1061 — congested send-queue defers staged fragment streams

## Status

Accepted (v1.8.084). Sibling of ADR-1060 (img chunks) — the same
silent mid-stream drop existed on the `snap`/`opc` fragment sender with a
larger blast radius.

## Context

`_fragSend` serializes a wire message into a 64KiB-fragment series for the
DataChannel: `k:'snap'` carries the join snapshot (up to 384 fragments,
ADR-0603) and `k:'opc'` carries an oversize single op (ADR-0431). The
receiver reassembles via `_fragIn` slots (`_snapIn`/`_opcIn`), which require
the complete `n`-fragment series and expire at 60s (ADR-0786).

## Problem

Like `_flushImgOuts` before ADR-1060, `_fragSend` pushed the whole series
synchronously through `_sendDC`, blind to an armed `_dcQ`. Fragments past
the 4096-message / 32MiB caps were silently discarded mid-stream:

- `snap`: the joiner's `_snapIn` slot can never complete — the joiner sees
  a permanently empty board while every bounded sync-req resend
  (ADR-0475) regenerates the same doomed multi-MB transfer under a
  persistently slow link (starvation + uplink amplification).
- `opc`: the oversize op never reaches peers — the sender's edit silently
  diverges; the receiver can only learn via a later sync-req.

## Decision

`_fragSend` stages the buffer as `[k,buf]` in `_fragOuts` and hands off to
`_flushFragOuts`, which mirrors the img-chunk deferral: budget-check each
fragment against the armed queue (`4096` msgs / `33554432+ε` bytes) before
`_sendDC`; on the boundary, keep the unstarted remainder in `_fragOuts`
(`outs.slice(i)` counts only fully-emitted buffers, so a partial stream
re-emits whole from `seq:0` and the receiver's slot restarts cleanly). The
`onbufferedamountlow` drain resumes `_fragOuts` *before* `_imgOuts` —
fragment streams carry causal board state (ops/snapshot) and drain ahead
of blob chunks.

`Net.init` clears `_fragOuts` alongside the other wire buffers
(room-scoped lifecycle, ADR-0464); a same-room link re-handshake keeps
staged streams like `_imgOuts` (ADR-1059 clears only the raw backlog —
the staged content is still valid for whoever joins next).

## Consequences

- Join starvation under congestion is closed: a snapshot either transfers
  completely now or resumes on drain; the joiner's bounded resends keep
  working as the fallback for genuine loss.
- Partial re-emit on `seq:0` is the same self-healing contract the
  receiver already implements (ADR-0469/0563 restart rules).
- Ordering preserved: deferred fragments re-enter `_sendDC` after the
  older backlog; frags resume before img chunks (causal data first).
- Coverage: 8 behavioural asserts (budget-gated partial stream, drain
  re-emit restarting at seq:0) + 2 source pins; `node test.mjs` 3700 pass.

## Contract

This completes the ADR-1060 rule for staged producers: every multi-message
series through `_sendDC` must either budget-check and defer (img chunks,
frag streams) or enqueue atomically. `_sendDC` itself is the only place
silent drops may occur; series producers must not feed the drop.
