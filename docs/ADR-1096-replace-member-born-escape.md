# ADR-1096: `replace` member install gets the `_born` escape; `_wTb` preserves `_born`

Status: accepted (1.8.120)

## Context

ADR-0922/0927 defined the existence-clock tomb semantics: a newer `_del`
outranks a restore, **unless** a `_born` newer than the `_del` proves the
id was legitimately reborn after the kill. `_tmb(id,op)` encodes that full
predicate — every re-introduction gate consults it.

Two gaps remained in the wholesale `replace` forward path:

1. The member-install loop re-implemented the tomb check by hand —
   `wd._del&&clockNewer(wd._del,op.clock)` — dropping the `_born` escape.
   A member of `op.after` whose local entry was `{_del@500,_born@600}`
   was skipped whenever `op.clock` predated the tomb, so the receiver
   lost a shape the sender legitimately holds — the same divergence class
   ADR-1095 fixed for `pageAdd`.

2. `_wTb` (the pre-wipe tomb-restore used by `replace`/`clear`/`_repC`)
   wrote `_wD(id,…)` — a whole-value `{_del}` replace — for every entry
   whose del should persist. That clobbered any `_born` on the entry:
   - a member admitted via gap 1 ended `{_del@500,_born@400}` (op clock
     re-stamped lower than the real 600) — installed but tomb-dead,
     so the next `dels` exchange advertised it dead to the room;
   - a `keep` survivor restored verbatim by `_wR` had its `{_del,_born}`
     entry clobbered to `{_del}` immediately after — same tomb-dead
     corruption for born-newer survivors.

## Decision

- Extract the predicate onto the entry: `_tmE(w,op)` holds the full
  tomb-vs-born semantics; `_tmb(id,op)` is now `return _tmE(_wc()[id],op)`.
  All `_tmb` call sites unchanged. Sites reading a pre-wipe snapshot
  (`wc0`) pass `wc0[id]` — the live map is empty by then.
- `replace` forward member loop: `if(_tmE(wc0[s.id],op))continue;` →
  `for(const s of _uniq(next))if(!_tmE(wc0[s.id],op))_sh().push(...)`.
- `_wTb` preserves a valid `_born` alongside the re-written `_del`, so a
  tomb+reborn record survives a wholesale swap intact and the real birth
  clock (not the swap's own clock) keeps arbitrating.

## Consequences

- An id in `op.after` with `{_del,_born}` and `_born>_del` is now
  installed and its true `_born` survives — `dels` suppression and future
  stale tomb arrivals arbitrate against the real clock.
- Plain tombs (`{_del}` only, del newer than the op) still skip the
  member — no semantic change.
- `clear` forward and `_repC` inherit the `_wTb` fix automatically.

## Tests

5 behavioural pins (test.mjs): born-escape member admitted; plain-tomb
member skipped; `_wTb` restores the real `_born` (600, not clobbered to
the op's 400); an op newer than the tomb installs + stamps its own born.
