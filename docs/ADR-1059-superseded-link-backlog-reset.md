# ADR-1059: superseded link's backlog is reset before the next channel

## Status
Accepted (implemented, v1.8.082)

## Context
`_sendDC` is the single funnel for every DC-bound message (ops, presence,
fragments, img chunks). When `dc.send()` throws on a full SCTP buffer the
funnel parks the message in `this._dcQ` (byte-accounted by `_dcQB`) and
drains it on `onbufferedamountlow`. While the queue is non-null every later
`_sendDC` call takes the `if(q)` branch and appends — nothing is sent.

Re-handshaking (`_wrtcInit` → `wrtcCreateOffer`/`wrtcAcceptOffer`) closed the
old `RTCPeerConnection` but never touched `this.dc`, `_dcQ`, or `_dcQB`.

## Bug
1. A congested send leaves `_dcQ` populated on the old link (e.g. a large
   snapshot/img stream — exactly when a user retries the handshake because
   it "looks stuck").
2. `_wrtcInit` runs `rtc.close()` (dc's `onclose` is queued as a task) and
   `wrtcCreateOffer` then synchronously assigns `this.dc` to the NEW channel.
3. When the old channel's `onclose` task fires, `this.dc!==dcRef` hits the
   ADR-0822 stale-close early return — the branch that clears `_dcQ` never
   runs. The backlog survives **forever** (until another catch resets it or
   the next link dies).
4. With `_dcQ` non-null, every `_sendDC` on the new link queues and never
   drains (`onbufferedamountlow` is only registered inside a catch). The new
   link is a **silent one-way wedge**: ops, presence, the join snapshot, and
   imgq answers all vanish — the joiner sits on an empty board with no error.
5. The symmetric hole: if the OLD channel's `onbufferedamountlow` fires while
   `this.dc` already points at the new channel, the drain re-sends the stale
   backlog through `_sendDC` → **cross-link op injection** into the wrong
   peer.

`Net.init` (room switch) has the same gap: `_dcQ`/`_dcQB` were not on the
reset list, so a backlog lingered until the async `onclose` cleared it —
harmless there only because `this.dc` keeps pointing at the old channel.

## Decision
- `_wrtcInit` closes `this.dc` explicitly and clears `_dcQ`/`_dcQB` BEFORE
  the new `RTCPeerConnection` is created — the backlog can neither wedge
  nor ride the next channel.
- `Net.init`'s reset line clears the same pair synchronously (belt+braces
  over the async `onclose` cleanup).
- The drain tolerates a queue cleared between throw and drain:
  `for(const x of b||[])`.
- The ADR-0822 stale-close early return is unchanged — it still protects
  the live link's state; the fix removes the backlog upstream instead.

## Consequences
- Re-handshake after a congested transfer can no longer wedge the new
  link's send funnel or inject old ops into the wrong peer.
- A stale `onbufferedamountlow` firing after a reset is a no-op, not a
  `TypeError` inside an event handler.
- Contract for future channel-swap sites: any path that replaces or drops
  `this.dc` must clear `_dcQ`/`_dcQB` in the same synchronous step.
