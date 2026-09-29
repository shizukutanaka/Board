# ADR-0822: superseded-channel guard — stale RTC events can't clobber the live link

- Status: Accepted (2026-09-28, v1.7.848)

## Problem

`_wrtcInit` closes the previous `RTCPeerConnection` before creating a
new one. Closing the pc still fires the OLD channel's `onclose` —
asynchronously, after `this.dc` has already been replaced by the new
channel. Two losing outcomes:

- Old `onclose` runs the live-link cleanup → deletes the NEW
  `_rtcPeerId` presence row and resets the new link's queues.
- Or (if guarded naively) the old channel's own `rtc:` row is never
  purged → orphaned presence row that `_reapPeers` explicitly skips
  forever.

The same stale-reference hazard existed in
`onconnectionstatechange`: after `this.rtc` is replaced, the old pc's
handler read `this.rtc.connectionState` — the NEW pc's state.

## Fix

- `_wireDC` captures `dcRef`; `onopen`/`onmessage`/`onclose` ignore
  events once `this.dc!==dcRef`. Each channel tags its own presence
  id (`dcRef._pid`); `onclose` purges THAT channel's row even when
  superseded, and only clears the shared `_rtcPeerId` pointer when
  it still owns it.
- `_wrtcInit` captures `pcRef`; the state handler reads
  `pcRef.connectionState` and returns early when superseded.

Invariant: transport objects that still fire after replacement touch
only state they own — nothing shared with the live link.

## Pin

`oldDc`+`newDc` stubs through `Net._wireDC`: stale `onclose` purges
its own `rtc:` row while preserving the live `_rtcPeerId` and its
row (test.mjs, ADR-0822 block).
