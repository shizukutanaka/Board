# ADR-1109 — page-tomb parity: local `replace` + implicit-member resolution

## Status

Implemented (v1.8.133, round859).

## Problem

Devin Review on ADR-1093 flagged four page-tomb lifecycle gaps. Two are
addressed here; two are deferred (see below).

### Gap 1 — `_recordCommitted` tombs shapes but not pages

The remote `replace` forward path tombs dropped page ids (`_wD(p.id,...)` for
each pre-swap page absent from `op.pages`, ADR-1093). The **local** commit
funnel — `_recordCommitted` for `replace` ops (doc-switch imports, load,
restore) — tombed only dropped *shape* ids. A local swap that dropped page
`p2` left no page tomb, so:

- the local `dels` emit had nothing to advertise to a joiner — the joiner's
  stale `p2` healed back as a zombie over `msg.pages` union,
- a later remote `pageAdd`/`snapshot` carrying `p2` was adopted locally even
  though it had been deliberately dropped.

### Gap 3 — `_pgDel2` resolves implicit members against the *post*-delete page

Implicit membership is `s.pg == null` → the shape belongs to the **first**
page. `_pgDel2` resolved membership via `(s.pg||firstId)===op.id`, where
`firstId` is the *surviving* first page computed after the splice. When the
deleted page was itself the first page, every `s.pg=null` shape was first
implicitly a member of `op.id` — but the predicate resolved them against the
next page and they escaped the kill set, then the rehome loop wrote
`s.pg=survivor`. Result: first-page deletion rehomed zombie members instead
of killing them (undo recorded them, but the live state diverged from the
sender's kill-set contract).

## Decision

### Fix A — local `replace` tombs dropped page ids

In `_recordCommitted`'s `replace` branch, after tombing dropped shape ids,
tomb dropped page ids with the same `_bN` escape the remote forward uses:

```js
const inP=_sT((op.pages||[]).map(p=>p.id));
for(const p of op.beforePages||[])if(!inP.has(p.id)&&!_bN(p.id,op.clock))_wD(p.id,op.clock)
```

`_bN` keeps a newer `_born` alive — a page that was *reborn* after the local
swap's baseline loses the tomb write, mirroring the remote-forward parity
exactly.

### Fix B — `_pgDel2(op,firstId,only,viewId,pg0)` carries the pre-delete first page

A new optional parameter `pg0` is the page id that was first **before** the
splice (`op.id` when `i===0`, else `null` — when the deleted page wasn't
first, `firstId` is unchanged and `pg0` adds nothing). Membership resolves on
the pre-delete first page:

```js
const _mp=s=>(s.pg||pg0||firstId)===op.id;
```

Callers pass `i===0?op.id:null`:

- `pageAdd` undo (`_apply` backward),
- `pageDel` forward (`_apply` forward),
- `dels` delta-channel handler — `pi` (the pre-splice index) is computed
  *before* the splice so `pi===0` can pass `id` as `pg0`.

`viewId` semantics (`undefined` = land on `firstId`, `null` = don't land)
are preserved — callers pass `undefined` explicitly at the two sites that
previously omitted the argument.

## Deferred (round860)

- **Gap 2** — `_pgClk` stamps a *rep-less* fallback clock
  (`{ts:nowTs(),peer:_pi()}`) so a healed page's `_born` outranks older tombs
  it should lose to.
- **Gap 4** — `p.nts` tracks rename clocks, not births; the wire has no
  page-birth carriage (`bts`/`btp` on page records + emitters + `_vPages`).

Both require wire-format birth-clock carriage for pages — one round, one
wire-schema change.

## Verification

- `node test.mjs`: 4090 pass / 0 fail (5 new pins).
- index.html raw: 556,974 B (< 557,056 ceiling).
