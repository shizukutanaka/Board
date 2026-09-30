# ADR-0811: Presence intake audit complete

- Status: Accepted (2026-09-28, v1.7.837)

## Decision

Audit of the full presence surface (`_onRecv` cases: img, frag,
op, hello, sync-req, snapshot, name, bye, ping, cursor, selection)
confirms every wire-carried field is bounded at intake:

- `msg.peer` — `_iS` + `MAX_PEER_ID_LEN` (8277).
- `cursor` x/y — `_iN` + `_fin`; unbounded coords are intentionally
  allowed (a peer may hover beyond the shape coord domain — viewport
  edge at MIN_ZOOM reaches center+20k; values just draw offscreen).
- `cursor`/`selection` `pg` — `_s0(msg.pg,64)`.
- `selection` `ids` — `_s0(_,MAX_OP_SHES)` + per-id `_idOK`.
- docName rename — `_iS` + `<=80`, `_tsOK` clock, `_nameWin` LWW,
  `namePeer` via `_idOK`.
- peers — anonymous by design (no `name` field stored; avatar color
  only), `MAX_PEERS` cap, presence timeout reap, `rtc:` lifecycle.

No changes; recorded so the next audit doesn't re-walk the surface.
