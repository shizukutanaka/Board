# ADR-1077 — `imgq` junk keys can't reserve throttle slots

Status: Accepted (round827, v1.8.101)

## Context

`case 'imgq'` answers blob re-requests by key. It looked up `_imgIn` /
`_imgSent` (the latter already `_idOK`-gated), stamped the per-key answer
throttle, and consulted the durable `imgs` store on a miss.

## Defect

`this._imgqT.set(msg.key, _t)` ran for **any** `msg.key` — the case had no
validation at all. The throttle map caps at 4096 entries (ADR-0836), but each
entry's *key* was unbounded attacker-controlled string data: a forged imgq
with a ~200 KB unique key is stored whole, so a peer could pin roughly
4096 × attacker-sized strings of retained memory — a quiet memory DoS inside
a bounded-everything-else protocol (every `img` chunk key is already capped
at 64 chars at intake).

Non-string keys (numbers, objects) were stored too — `Map` accepts them and
they'd stamp-and-store just the same.

## Fix

```
if(!_idOK(msg.key))break;
const d0=this._imgIn.get(msg.key)||this._imgSent.get(msg.key);
```

An early `_idOK` gate (string ≤64 — the same bound `img` chunk keys take)
now precedes the lookups, the throttle stamp, and the IDB miss path; the
`_idOK` ternary around `_imgSent` becomes unconditional. Legitimate keys are
≤64 by construction (`k:N` slim ordinals, `@`-stripped foreign refs, hash
keys — all minted inside the same bound), so nothing answerable is lost.

## Behavioural pins

- oversized (4 KB) and non-string keys leave `_imgqT` empty after a forged
  `imgq` via `_onRecv`; a valid key still stamps the throttle.

## Verified clean alongside

- `copyBoardJSON` / clipboard `.board` / selection export all ride
  `roundShapesForExport` → the ADR-1042 conditional `img` strip (parked refs
  travel out for import-side imgq heal).
- BroadcastChannel is room-scoped (`board:`+roomId) and closed on every
  `Net.init` — no cross-room BC injection.
- `_onRecv` verifies `mac`/`dmac` *before* the kind switch for every kind;
  `hello`/`ping`/`sync-req` additionally drop on RTC (ADR-0986).
- `presence.n` (ADR-1053) reaches DOM only via `canvas.fillText` and
  `el.title` — no HTML sink.
- `exportToUrl(enc, ro)` carries `ro` only when the share-modal checkbox is
  set — ro is a local input gate, not a permission boundary (ADR-1057).
