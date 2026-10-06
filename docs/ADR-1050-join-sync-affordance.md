# ADR-1050: Join-sync progress affordance

Status: implemented (round799, v1.8.076)
Axis: ADR-1048 improvement candidate **P0-a** — *"a large board's initial
snapshot currently looks like a hang — surface transfer progress or a
'syncing' state."*

## Context

Joining a room goes through a silent hand-off:

1. `Net.init` sends `hello` + `sync-req`; a bounded 3×5s retry loop
   re-asks while `_snapRx` stays false (ADR-0475).
2. A peer answers with a `snapshot` — whole-message on the BC path,
   or a chunked `snap` frag stream reassembled in `_snapIn` on the RTC
   invite path (ADR-0383/0400).
3. Until the snapshot lands, the joiner's canvas is simply blank and the
   statusbar says only "online"/"offline". On a large board over a slow
   DataChannel, the user sees an empty board for seconds with no signal
   that data is transferring — indistinguishable from a hung join.

## Decision

Add a signature-gated statusbar affordance driven by `Net._syncTick`:

- **Show** `t('syncing')` while `!this._snapRx && _pr().size > 0` — a
  snapshot is owed and a peer exists to answer it.
- **Show progress** `t('syncing') + ' g/n'` while a `_snapIn` frag stream
  is in flight (RTC path; the BC path delivers whole messages).
- **Hide** otherwise — solo boards never show it (no peers ⇒ nothing is
  owed, so a fresh board does not flash "syncing" during the silent
  sync-req retries).

`Net._syncTick` recomputes and calls `Net._syncUI(msg)` only when the
message changes (`_syncMsg` signature), so a 5s presence sweep costs a
string compare, not a DOM write. `UI._setSync` writes to `#sSync`
(`hidden` toggled via `_hdn`, `_syncSig`-gated — the same signature
pattern as `_statusSel`/`_selDimSig`).

Call sites, each covering a state edge:

- `Net.init` — reset `_syncMsg`, hide on room switch.
- Presence sweep (every 5s) — peer arrival/loss, retry exhaustion, and
  `_reapFrags` TTL expiry of a stalled `_snapIn` all re-derive here.
- `_fragIn` (`'_snapIn'` only) — live `g/n` progress per chunk.
- `case 'snapshot'` — `_snapRx=true` clears the indicator the moment the
  snapshot is adopted.
- `_touchPeer` — first peer makes the affordance appear without waiting
  for the next sweep.
- `dc.onclose` / `connectionstatechange='failed'` — the `rtc:` peer row
  is dropped, so the condition hides; the tick makes it immediate.

## Rejected alternatives

- **Riding `#sConn`**: `updateOnline` owns that span and would clobber
  mid-sync on any navigator online/offline event; mixing domains is
  exactly the kind of temporary workaround the codebase avoids.
- **A toast**: toasts auto-dismiss and would either vanish mid-transfer
  or require a re-fire loop — noise, not progress.
- **Always-on while `!_snapRx`**: a solo fresh board would show
  "syncing" for the entire retry window with nothing owed — false
  signal on the primary use case.

## Contract for future touchers

- The indicator is derived state — never write `sSync` outside
  `UI._setSync`/`_syncTick`.
- Keep the trigger `!_snapRx && _pr().size > 0`: a peer count of 0 must
  stay silent.
- New frag-slot kinds that delay snapshot usability should tick with
  their own progress, not fork the surface.

## Verification

Behavioural pins in test.mjs: solo board stays silent; peer present ⇒
'同期中'; in-flight `_snapIn` reports '同期中 2/5'; `_snapRx=true`
clears. Source pins cover the `#sSync` DOM node, the `_syncUI` wiring
and both locales.
