# ADR-1070: Wire-secret lifecycle — SDP codec owner fix + `k` intake bound

## Status
Accepted (v1.8.093, round819).

## Context

ADR-1056 gave wire messages a cheap auth tag: every BroadcastChannel message
carries `mac` and every DataChannel message `dmac`, both FNV-1a-mix HMACs over
a canonical envelope. The BC key is the document secret `state.roomSecret`
(`rs`), minted lazily by `_sec()`; the DC key is `Net._dcKey`, agreed through
the SDP token's `k` field during manual signaling.

This round audited the secret's whole lifecycle — mint, persistence,
adoption, reset, propagation — and found **two defects**, one of them a
complete feature kill.

## Findings

### F1 — SDP token codec called `this._b64u*`, which lives on `Share` (real bug)

ADR-0160 modernized the invite tokens to UTF-8-safe base64url and rewrote:

```js
_encodeToken(sdp){ return this._b64uEnc(...) }
_decodeToken(s){ try{...decode(this._b64uDec(s))}catch(_){legacy} }
```

`_b64uEnc`/`_b64uDec` are methods of the **`Share`** object (created for the
ADR-0015 AES layer), not `Net`. `this` inside `Net._encodeToken`/`Net._decodeToken`
is `Net`, so both throw `TypeError: this._b64u* is not a function` on every
call — the whole manual-signaling flow (create offer, accept offer, consume
answer, `#s=` invite path) dead since ADR-0160. BroadcastChannel-only users
never notice; any real RTC join fails immediately at token (de)serialization.

Fix: call the helpers where they live — `Share._b64uEnc`/`Share._b64uDec`.

### F2 — SDP token `k` adopted with no bound (hardening)

`_decodeToken` returned `k:_iS(j.k)?j.k:null`. Every other secret intake is
bounded: `_sec()` gates localStorage `board.rs` at `_iS && ≤64`, `Persist.load`
and `restoreBackup` gate `d.rs` identically. A hand-pasted or maliciously
composed token could carry an arbitrarily large/non-canonical `k` — adopted
into `_dcKey`, it becomes HMAC key material hashed per send (`_dmac` cost is
linear in key length). Bound `k` at `≤64` — exact parity with `rs` (`uid()`
output fits well under 64 chars, so no legitimate key is rejected).

## Audit result — the rest of the lifecycle is clean

| Surface | Rule | Verified |
|---|---|---|
| Mint | `_sec()` lazily `uid()×4`, persisted to `localStorage.board.rs` (≤64) | ✓ |
| IDB persistence | `save()`/`saveBackup` records carry `rs:state.roomSecret` | ✓ |
| IDB adoption | `load()`/`restoreBackup` adopt `d.rs` gated `_iS && ≤64` — **own records only** | ✓ |
| Export payloads | `.board`, share link, `copyBoardJSON` carry **no** `rs` | ✓ |
| Import adoption | `importBoard`/`importFromHash` read **no** `d.rs`/`data.rs` — a crafted file/link cannot set the victim's secret | ✓ |
| `_dcKey` resets | `Net.init` (room switch), `_wrtcInit` (new handshake), `dc.onclose` all null it — no stale key rides a new link | ✓ |
| Propagation | offer token carries `k=_dcKey`; answerer + answer-consumer adopt it — link MAC keys converge per pair | ✓ |
| Envelope coverage | `_canon` MACs every field except `mac`/`dmac`/`data`; `data`-bearing kinds (img chunks) are content-hash verified anyway; frag streams are DC-gated (ADR-0987) | ✓ |

## Contract for future secret fields

1. Any new secret intake bounds `_iS` + a byte cap matching `rs` (≤64).
2. `rs` must never be serialized into share links, `.board` exports, or wire
   ops — it travels only inside our own IDB records and SDP `k`.
3. `_dcKey` must be nulled on every link teardown/supersede — a stale key
   must not MAC a different link's traffic.
4. Helper methods may only be referenced through the object that owns them —
   cross-object `this.` calls in object-literal modules resolve to the
   literal, not a neighbour module.

## Test coverage (test.mjs)

Behavioural: offer-token encode→decode round-trip, `k` absent → `null`,
`k` ≤64 adopts, `k` >64 / non-string rejected. Source pins: `Share._b64u*`
call sites, zero `this._b64u` references, `k` bound, both `d.rs` adoption
sites gated, `rs` carried in `:prev`, ≥3 `_dcKey` reset sites, no `rs` in
export payloads.
