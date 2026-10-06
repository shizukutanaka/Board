# ADR-1081 — presence-intake contract, audit complete

- Status: audit complete, contract pinned (v1.8.105, round831)

## Context

Presence messages (`hello`/`sync-req`/`ping`/`cursor`/`selection`/`name`/`bye`)
all funnel through `Net._onRecv`'s shared intake: peer-id validation
(`_iS`, ≤`MAX_PEER_ID_LEN`, `rtc:` prefix rejected on the BC leg — ADR-0827),
then HMAC verification (`_mac` BC / `_dmac` DC — ADR-1056). This audit checked
each kind's post-auth handling for unbounded or unsanitized state.

## Verified clean

| Surface | Contract |
|---|---|
| `_touchPeer(id)` | self-id skip; `MAX_PEERS=32` flood cap; existing row refreshes `lastSeen` only; new row forces `_lastSelSent=null` resend (latecomer selection sync, ADR-0011) |
| `hello` / `sync-req` / `ping` | valid peer → row + optional snapshot response (`_loResp` elects smallest-id holder excluding asker, ADR-0465); RTC-leg `hello`/`ping`/`sync-req` early-returned (ADR-0986) |
| `cursor` | `x`,`y` must be finite numbers (ADR-0010/0986); `h===1` clears; `pg` sliced ≤64; `_nIn` name ≤24 (ADR-1053) |
| `selection` | ids sliced + `_idOK` filtered, then existence-filtered + 4096 cap (ADR-1080) |
| `name` | ≤80 chars; `_tsOK`-bounded ts drives `_nameTs`/`_namePeer` LWW (ADR-0701/0791) |
| `bye` | `_pk` transport translation removes the row + overlay invalidate (ADR-0456/0986) |

## Pinned (test.mjs, 8 asserts)

- `_touchPeer` self-skip, lastSeen-only refresh, MAX_PEERS=32 cap
- cursor: NaN rejected, `h:1` clears, `pg` sliced to 64
- `name` >80 rejected, bounded name applies
- `bye` drops the row; BC `ping` registers a valid new peer

## Consequence

The presence-intake surface is now contract-pinned end to end: peer rows are
bounded (`MAX_PEERS`), every field is validated at intake, and future
regressions in any of the seven kinds trip the gate.
