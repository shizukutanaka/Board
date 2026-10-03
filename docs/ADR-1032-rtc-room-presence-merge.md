# ADR-1032: Dual-connected presence merge — link partner × room peer

## Status

Accepted — implemented.

## Context

Round781 (おまかせ improvement loop), continuing the presence receive-side
render audit. `_pr()` mixes two row kinds: real peer ids (learned via
BroadcastChannel presence) and the synthetic `rtc:` row created at
`dcRef.onopen` for the RTC link partner (`Net._rtcPeerId`).

`_pk(msg,viaRtc)` routed **every** viaRtc message to the synthetic row:

```js
return viaRtc?this._rtcPeerId:msg.peer;
```

Presence (`cursor`, `selection`) is `_bcast` — dual-transport by design —
so when the link partner is **also a member of the same room**, their
presence lands twice:

- via BC → real row `p-abc` (their own peer id)
- via DC → synthetic row `rtc:x9qz`

## Defect

Every presence-aggregating surface counts the same human twice:

- `UI.refreshPeers` iterates `_pr()` with no `rtc:` filter → two avatars
  (`P-…` + a phantom `RT` entry).
- `peerCount()` / `_onConnChange` (`_pCt`) → SR announces "peer joined" for
  the phantom and inflates the count by one.
- `drawPeerCursors`/`drawPeerSelections` draw both rows — the duplicate
  lands on the rtc row's (possibly different) color.
- The phantom persists for the whole session: rtc rows are lifecycle-managed
  by `onclose`, never reaped.

## Decision

Merge at the routing helper, not at each consumer:

```js
if(msg.peer&&_pr().has(msg.peer)){
  if(this._rtcPeerId&&_pr().delete(this._rtcPeerId))_ivO();
  return msg.peer;
}
return this._rtcPeerId;
```

- Dual-connected partner → presence lands on the real row; the synthetic
  row is folded away once (one `_ivO()` repaint on the actual delete).
- Pure-link partner (no matching row) → keeps the synthetic row exactly as
  before: avatar shows the link, lifecycle stays `onclose`-managed.
- `Net._rtcPeerId` stays set — link bookkeeping (`bye`, `_loResp`,
  `onclose` purge) is unaffected.

## Why at `_pk`

All three presence consumers (`bye`, `cursor`, `selection`) route through
`_pk`; a single merge there fixes rows, draws, and counts uniformly. The
`bye` path stays consistent: a dual-connected partner's pagehide `bye`
(sent via `_bcast`) folds the rtc row and deletes the real row — presence
fully cleared either way.

## Residuals (accepted)

- **Transient phantom window**: the `rtc:` row is created at `dcRef.onopen`
  before the partner's real id is known. If the partner is a room peer but
  their DC presence hasn't arrived yet, the `RT` avatar shows briefly and
  folds away on the first viaRtc presence message. Gating row creation on
  the first message would instead hide the avatar in pure-link sessions
  until the partner's first pointer move — worse UX, rejected.
- **`msg.peer` spoofing**: a link partner could forge `msg.peer` to fold
  presence onto another row — cosmetic only, no authority beyond the
  presence channel they already own.

## Pins (test.mjs, 6 asserts)

1. Source pin for the merge expression.
2. Behavioural: `_pk` viaRtc + existing BC row → real peer id returned.
3. Behavioural: synthetic row deleted on merge.
4. Behavioural: no matching row → synthetic id returned (pure-link path).
5. Behavioural: BC path (`viaRtc=false`) unchanged.
6. Source pin comments re-verify the fold semantics (`_ivO` on delete).
