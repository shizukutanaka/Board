# ADR-1056: wire message authentication (room-secret HMAC)

Status: accepted (implemented)
Implements: ADR-1048 candidate **P1-c**

## Context

Every wire message — the whole `k:` kind space on both transports — was
unauthenticated. BroadcastChannel `board:<room>` accepts posts from any
Board tab on the origin (channel = `board:` + roomId), and the RTC
DataChannel accepts anything its link partner sends. ADR-1048 ranked this
the top design hole: a stray tab from a *different* document opened on the
same room channel could inject ops into the doc's consensus stream, and
there was no cheap way to tell "a message from a peer holding the doc" from
"anything else that can post".

Nothing existing fixed it: `peer`/`ts`/`seq` are unsigned metadata anyone
can forge, dedup only prevents *replays*, and intake validation bounds
shape/content but never asks *who may speak*.

## Decision

**A doc-scoped 128-bit secret (`state.roomSecret`, seeded `uid()×4`) keyed
HMAC tag on every wire message, enforced at intake.**

- `_hmac` = deterministic FNV-1a×4 variant (no dep, no WebCrypto async) —
  the tag is a *capability token*, not a collision-resistant signature;
  it only has to be unguessable, not cryptographically strong.
- `_sec()` resolves the secret: **localStorage `board.rs` wins** (the only
  store all same-origin tabs share — two tabs that boot before any IDB
  save must still converge), else the IDB record's `rs` adopted by
  `load()`/`restoreBackup`, else generate + seed ls. `save()` persists
  `rs` with the doc record.
- `_canon(m)` = canonical JSON of the msg minus `mac`/`dmac`/`data`.
- BC msgs carry `mac = _hmac(secret, canon)`; RTC msgs carry
  `dmac = _hmac(linkKey, canon)` where `linkKey = dcKey || roomSecret`.
- `_onRecv` drops any msg whose tag is missing or `!==` the local tag —
  checked before `_touchPeer`, dedup, or any state mutation.

### RTC link key

Offer/answer SDP tokens carry the doc secret as `k`
(`offer() {type,sdp,k}`). The answerer adopts it as `Net._dcKey`; the
offerer's `_dcKey` is its own secret — both sides authenticate `dmac`
against the same key. `Net.init`/`dc.onclose` reset `_dcKey` so a dead
link can't keep speaking for a key it no longer holds.

### What it does and does not protect

**Protects:** cross-document BC pollution, unpaired/stale RTC traffic,
forged messages from anything that never saw the doc or the invite token.
**Does not protect:** against a same-origin attacker that reads
localStorage (they hold the secret anyway) — the doc boundary is the
origin's localStorage, plus the link token for RTC. The peer that
completes the handshake is trusted by design; the point is that *no one
else* is.

### Compatibility break

A pre-1.8.079 tab sends no tag → dropped by a 1.8.079 peer (and vice
versa). All tabs load the same `index.html` from the same URL, so a
realistic room is one version; a stale SW cache is the only mixer, and
the room silently desynced already when that happened (ADR-0613+).

## Consequences

- `k:'op'`, `snap`, `opc`, frag chunks, `img`/`imgq`, presence, `name`,
  `bye`, `sync-req` — the entire kind space — all ride the same tag gate;
  a new kind is covered automatically unless it bypasses `_send`/`_sendDC`.
- `_dcQ`-queued messages were tagged at queue time; replay re-verifies.
- Cost: one `_canon`+FNV pass per message (O(bytes), small msgs);
  presence (~4 msgs/s) is unchanged on the wire order of bytes.
- `rs` never leaves the doc record + localStorage + the SDP token `k`
  field — share links and `.board` exports do not carry it (the export
  path has no `rs`).
- The fallback `crypto.randomUUID`-less `uid()` still produces a 128-bit
  secret because we concatenate four — entropy is per-`uid`, not secret.

## Pins (test.mjs)

9 behavioural asserts: forged `mac` dropped on BC, correct `mac` applies;
`dmac` tagged DC op applies, BC `mac` does *not* authenticate the DC path;
untagged DC msg dropped; `rs` round-trips through save/load; token `k`
adoption; `_dcKey` cleared on `dc.onclose`.
