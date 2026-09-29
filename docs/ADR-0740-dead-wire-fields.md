# ADR-0740: dead wire fields removed

## Status
Accepted (2026-09-28)

## Context
Audit of every `msg.*` field read on the receive side against what `_mk`/sends
emit found three fields that are written but never read:

- `hello.seq` and `ping.seq` — `{seq:state.seq}` mimics a lamport clock but no
  handler touches `msg.seq` on those kinds (only chunk-fragment `seq` fields at
  the reassembly layer are real). `state.seq` is also never incremented for
  them, so the value was meaningless anyway.
- `snapshot.curPg` — `_applySnapshot` deliberately does NOT adopt the sender's
  page view (ADR-0672: curPg is a local filter; a re-sync must not yank the
  receiver's view). The field was ~20 dead bytes in every snapshot.

## Decision
Drop all three. Wire-compatible: receivers ignore unknown fields and these were
never required — old/new peers interop unchanged.

## Consequences
- ~50B off the wire per cycle (ping re-sends every presence tick).
- Source pins: hello/ping sends take no payload arg; `pages:state.pages` is no
  longer followed by a `curPg` field in `_snapshotMsg`.
- Op-level `curPg` (pageAdd/replace wire ops, ADR-0646/0720) stays — those DO
  drive the receiver's landing page by design.
