# ADR-0728: sync the undo-wire convergence rules to architecture.md

## Status
Accepted (実装済)

## Context
ADR-0717–0727 closed a family of undo↔wire divergence holes across
eleven PRs. The invariants (undo = new competing write; reverted state
rides its original clock; membership follows current state not op
payloads; rehome targets ride the wire; locked gates are symmetric;
slim-op keeps wire-domain fields; validators cover clock snapshots) were
spread across seven ADRs — architecture.md's `undo×sync` bullet still
read as if inverse-op broadcast were the whole story.

## Decision
Document the seven rules inline under `undo×sync`, each tagged with its
ADR so future edits to `_apply`, `_undoWire`, `_slimOp`, or
`validRemotePayload` can find the governing decisions locally.

## Consequences
- No code change; pin coverage is behavioural (two-peer asserts in
  test.mjs) — this round is docs-only at v1.7.753.
