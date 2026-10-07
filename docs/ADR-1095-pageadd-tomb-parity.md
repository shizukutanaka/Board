# ADR-1095: `pageAdd` forward gets `add` parity — `_tmb` gates the page id and the member loop

## Status
Accepted (round845, v1.8.119)

## Context
ADR-0734 gave shape `add`/`addMany` the tombstone gate: `_tmb(id,op)` — a newer `_del` tomb
(with no newer `_born` outranking it) kills a stale add at intake, so a deleted id cannot
zombie-resurrect. ADR-1093/1094 put page ids on the same existence-clock machinery
(`_wD`/`_bT`/`_bN`), but `case 'pageAdd'` forward never consulted a tomb:

1. **Page id had no `_tmb` gate.** The forward branch spliced `state.pages`
   unconditionally once it ran — creating `{id,name:'?'}` on a fresh set, promoting a
   `'?'` stub, or inserting at `op.i`. A stale `pageAdd` (delayed wire delivery behind a
   newer `pageDel` tomb, or redelivery after `seenOps` eviction) resurrected the page as
   a zombie: it moved `curPg`, re-attributed un-paged `s.pg`, and attached `op.shapes`
   members. The zombie only healed when a later `dels` exchange reached this peer —
   a divergence window `add` parity exists precisely to eliminate.

2. **The member loop used a hand-rolled check missing the `_born` escape.**
   `if(wd&&wd._del&&clockNewer(wd._del,op.clock||{}))continue` re-implements half of
   `_tmb` but drops its third clause (`!(wd._born&&clockNewer(wd._born,wd._del))`). A
   member shape that was reborn after its tomb (undo-restored, re-added — born newer
   than del) got wrongly skipped whenever the op clock predated the tomb, so the
   receiving peer diverged permanently from the sender's membership.

## Decision
- `pageAdd` forward begins with `if(_tmb(op.id,op))break;` — a tombed page id rejects
  the whole op (page, `curPg` move, `s.pg` re-attribution, members), exactly as a stale
  `add` contributes nothing. A *newer* `pageAdd` (clock outranking the tomb) is a
  legitimate rebirth: `_tmb` is false, the page is created, and `_bT` stamps the born.
- The member loop checks `if(_tmb(sh.id,op))continue;` — one canonical primitive, so the
  `_born` escape now works on this path too: a member reborn after its tomb is admitted;
  a member whose tomb outranks the op clock (and has no newer born) stays out.

Backward (`pageAdd` undo → `pageDel`) is unchanged: `_pgDel2` already carries the
ADR-1094 `_bN` gate, and `pageAdd` backward passes the add's own clock so a born that
ties it still writes the tomb.

## Tests (test.mjs, 5 asserts)
- Stale `pageAdd` (tomb ts:200 > op ts:100): page not created, `state.pages` stays null,
  member shape not added.
- Newer `pageAdd` (op ts:300 > tomb ts:200): page created and `_born` stamped ts:300 —
  rebirth outranks the tomb.
- Member loop: `m10` with `_del@500` + `_born@600` is admitted under op clock ts:400
  (born escape); `m11` with `_del@500` and no born is skipped.
