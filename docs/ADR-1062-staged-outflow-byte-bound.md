# ADR-1062 — staged outflow shares the answer store's byte bound

## Status

Accepted (v1.8.085). Completes the ADR-1060/1061 staged-deferral
subsystem: the staging arrays themselves now have a bound.

## Context

ADR-1060 (img chunks) and ADR-1061 (snap/opc fragments) defer a
multi-message stream into a staging array (`_imgOuts`, `_fragOuts`) when
the `_dcQ` backlog is armed and past cap; the `onbufferedamountlow` drain
resumes them.

## Problem

A persistently wedged link never drains — and every producer keeps
staging:

- each sync-req answer on the DC stages a full snapshot buffer (up to
  24MiB per stream, ADR-0603),
- each imgq answer stages a whole blob,
- each oversized op stages a full `opc` payload.

Nothing bounded the staging arrays, so a slow link plus routine traffic
grew responder memory without limit — the same unbounded-accumulation
class the wire side already guards everywhere else (0738/0781–0785).

## Decision

`_stgOK(outs,b)` sums the staged payload bytes plus the candidate and
admits the push only while the total stays ≤ 64MiB — the same bound the
`_imgSent` answer store already uses (ADR-0842), since the staged
content is a subset of that store.

Applied at all three staging sites:

- `_fragSend` sheds the incoming stream wholesale (joiner resends via
  the bounded sync-req path).
- `_slimShapes` skips the stage push but still marks `_imgSent` — the
  ref parks on receivers and the blob arrives later via imgq.
- the imgq answer site gates its push+flush while still stamping the
  10s throttle (prevents a stampede on a wedged link; the requester's
  park simply heals via the 5-min `_imgRescan`).

Shedding the *newest* staging (rather than the oldest) preserves
already-promised streams and keeps the bound a soft shed, not a
re-ordering.

## Consequences

- Responder memory under a permanently congested link is bounded at
  ~64MiB of staged outflow.
- Shed streams self-heal through the existing re-request paths
  (sync-req, imgq rescan) once the link drains.
- Coverage: 9 asserts (at/over-cap admit, shed-newest semantics for frag
  staging, three source pins); `node test.mjs` 3708 pass.
