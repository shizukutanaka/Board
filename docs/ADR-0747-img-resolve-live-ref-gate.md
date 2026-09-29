# ADR-0747: img blob resolution is gated on the live ref

## Status
Accepted (2026-09-28)

## Context
ADR-0745/0746 fixed the two snapshot-merge producers of a stale
`_imgPending` entry. A third producer exists outside the merge path:
an `upd`/`style` op applies `op.after` verbatim (`_oa(sh,p)`) — it can
rewrite `sh.img` to a new ref (replace-image) or set `dataUrl`
directly, while a pending entry for the OLD key stays registered under
the same shape id. When the old blob arrived, the resolution wrote
unconditionally:

```js
if(k===msg.key){const sh=byId(id);if(sh){delete sh.img;sh.dataUrl=data}...}
```

— deleting the LIVE `sh.img` (possibly a different, newer ref) and
clobbering `sh.dataUrl` with the stale image.

## Decision
Gate the pending resolution on the shape still referencing that key:

```js
if(sh&&sh.img===msg.key){delete sh.img;sh.dataUrl=data}
this._imgPending.delete(id);   // stale or resolved — entry drained either way
```

A shape holding a different ref is untouched; the stale entry is
drained so it can't fire later either. A ref that was never pending
(upd-path writes don't register) still resolves via the ADR-0629
board-scan, which already checks `s.img === msg.key`.

This is the belt-and-suspenders complement to 0745/0746: even if a
future writer leaves a stale pending, the resolution itself is now
safe.

## Consequences
`sh.img`/`dataUrl` can no longer be rewritten by a blob for a key the
shape doesn't currently reference. ~18B; 5 behavioural asserts pin
stale-skip + live-resolve.
