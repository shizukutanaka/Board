# ADR-0835 — parked img refs re-request the blob via `imgq`

## Context

Wire image refs (ADR-0069) park in `Net._imgPending` when a shape arrives
before its `{k:'img'}` blob stream — normally resolved seconds later by the
in-order chunk flush. A park becomes permanent when the sender dies mid-flush
or the receiver missed an earlier session's stream entirely: the shape keeps an
unresolvable `img:` ref and renders blank until the next snapshot happens to
re-emit the key — i.e., forever in a stable two-peer room.

## Decision

`_imgPending` entries are now `{k, t0}` (key + parked-at). The 5s presence
heartbeat sweeps the map:

- `nowTs - t0 > 2·interval` → broadcast `{k:'imgq', key}` once per tick.
- `nowTs - t0 > 60s` → drop the park (the shape's `img:` ref still heals —
  blob resolution sweeps `_sh()` directly, so a late-arriving blob or a future
  snapshot still fixes the image).

Peers answer `imgq` from `_imgIn` (a received blob) or by scanning `_sh()` for
a live shape still holding `s.img===key` + `s.dataUrl`, then flush
`_imgOuts` immediately — no extra round-trip machinery. `imgq` keys are
`_idOK`-bounded like every wire id.

## Why not a dedicated request channel

A pull model (ask → answer) reuses the existing broadcast fan-out: every peer
hearing `imgq` that holds the bytes re-emits them once, so the whole room heals.
No addressing, no new ack state.

## Test

Behavioural pin in test.mjs — `Net._onRecv({k:'imgq'})` answers from both the
live shape's `dataUrl` and the `_imgIn` blob store (send captured via `Net._send`
stub), and an oversized key is ignored. The pending-map assertions moved to the
`{k,t0}` value shape.
