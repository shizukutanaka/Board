# ADR-0998: peer-clock uniqueness audit — complete

## Status
Accepted — documentation + pins. No code change required.

## Context

CRDT dedup keys are `_ck(op) = clock.peer + ':' + clock.seq` in `seenOps`.
The hazard class: if a `(peer,seq)` pair is ever reused for two distinct
ops, `seenOps` silently drops the second op — a divergence that spreads to
every peer. A subtler variant: `state.seq` restarts at 0 on reload while
`peerId` persists — a restarted tab's seq=1..N ops would collide with
entries peers already dedup'd from the previous incarnation.

## Audit result — all clean

### Incarnation-scoped peer id closes the restart collision
`peerId = PEER_ID + '.' + uid().slice(0,6)` (index.html:1157, ADR-0459):
the persisted base `board.peer` is augmented with a per-boot 6-char
suffix. Every boot mints a distinct `clock.peer`, so a seq restart can
never reuse a key a peer already dedup'd. The base is re-validated at
boot (malformed/`rtc:`-prefixed values regenerate, ADR-0827).

### Every wire op consumes a fresh `++state.seq`
All stamp sites monotonic: commit path (`_fck` fallback, 9814), undo
restamp (1584), undo-wire ops (1588 — one fresh seq per emitted op),
page ops (2140, 2158), paste-addMany (7043), `_recordCommitted` fallback
(1563). No two ops can share `(peer,seq)` within a boot.

### `seq:0` / `seq:i` literals are not op clocks
- `{ts,peer,seq:0}` objects at 869 (`_nameWin`), 1784/1785 (pageName
  arbitration), 8211 (snapshot page-name heal) are compare operands for
  `clockNewer` only — never stored into `seenOps` or sent as op clocks.
- `seq:i` at 8030/8053 are fragment-reassembly indices (snap/img
  streams), not op clocks.
- `seq:'snap:'+s.id` (8251) is namespaced snapshot-embedded clock.

### Persisted wclock across boots
Old-incarnation clock values persist in `wclock` (by design — they're
the evidence base for LWW arbitration, compared by (ts,peer,seq) total
order, not by dedup key). `_lwwSkip`'s `peer!==_pi()` test correctly
treats own prior-incarnation writes as remote — they arbitrate as older
writes.

## Pin coverage (test.mjs)

- `state.peerId` carries the per-boot suffix (`/\..{6}$/`).
- Two commits → `state.seq` +2; both ops enter `seenOps` (no collision).
- Dedup keys bind the full incarnation id (`peerId:seq` format).
- Undo stamps fresh seqs (op restamp + per-wire-op seqs).
