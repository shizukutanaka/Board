# ADR-1026 — Failed remote applies evict the dedup key

## Status

Implemented.

## Context

`Store.applyRemote` stamps the dedup key (`seenOps.add(ck(op))`) **before**
the op is applied. Between the stamp and a finished apply lie `_lwwDrop`,
the 'replace' pre-guard + `Persist.saveBackup`, `_remoteDelConnFix`, the
pg-heal stamp, `this._apply(op,true)` (a large switch touching shapes,
wclocks, damage harvest), connFix patches, and `_stampWrites` — any of which
can throw on an edge case `validRemotePayload` legitimately cannot foresee
(a bounded-but-broken prop combination, a corrupted store object, a future
code path with a new precondition).

A throw there left the op **stamped but never applied**: the same op can
never be re-delivered (`seenOps` drops it on sight), and it only ever
re-enters via snapshot heal — which calls `applyRemote` again and gets
dropped by the same stamp. The two sides diverge permanently and silently:
the peer applied the op, we recorded it as applied, and half (or none) of
its mutation ran.

Separately, `bc.onmessage` called `_onRecv` with no guard while the DC path
has had `try{...}catch` since ADR-0010 — one malformed BroadcastChannel
message surfaced as an uncaught error and aborted the rest of that event's
processing.

## Decision

- `applyRemote` wraps everything after the dedup stamp in `try{...}`,
  and on `catch` runs `_sO().delete(k)`. A failed apply therefore behaves
  like a message that never arrived: the op can be re-applied on the next
  re-delivery or snapshot heal. Retries are bounded — heal only happens on
  join/sync-req, never in a hot loop — and re-applying a partially-run op is
  safe because every case writes absolute state (no deltas).
- `bc.onmessage` gets the same `try/catch` guard as the DC path at the
  RTC handler — one bad message can no longer poison the channel's event
  dispatch or sibling processing.

## Contract for new code

Any intake path that stamps a dedup/seen marker BEFORE the guarded work must
evict that marker when the work fails. Dedup keys own exactly the span of
the apply that follows them — stamp→apply→settle is one atomic claim.

Local `commit`/`undo`/`redo` stay unguarded on purpose: a throw there is a
real bug (our own op construction), not untrusted input — fail-fast keeps
the defect visible instead of silently retrying local writes.

## Pins (test.mjs)

- Behavioural: stub `Store._apply` to throw → `applyRemote(op)` → restore;
  re-deliver the same `{peer,seq}` → the second call reaches `_apply`
  again (key was evicted).
- `catch(_){_sO().delete(k)}` present in the applyRemote body.
- `bc.onmessage` guarded exactly like the DC path; no unguarded form left.
