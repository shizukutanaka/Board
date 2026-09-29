# ADR-0743: architecture.md wire-format sync (0739–0742)

## Status
Accepted (2026-09-28)

## Context
The op-catalogue and wire sections still described the pre-0729 shapes:
`move` as a bare `{ids,dx,dy}` delta and `zorder` as a `{before,after}`
wholesale snapshot, and the caps bullet referenced the since-removed
`after` legacy form. ADR-0729/0739/0740/0741/0742 changed the wire
contract without the prose keeping up.

## Decision
Sync, no behaviour change:

- op list: `move` documents the required absolute `after` (+ optional
  `before`); `zorder` documents the `changes` minimal-delta form only.
- wire section: new "mixed-version intake" bullet covering the HLC-floor
  unification (0739), dead-field strip (0740), absolute-move requirement
  (0741) and changes-only zorder (0742) — the rule that stale-SW peers'
  legacy wire forms are rejected rather than applied on a raced base.
- caps bullet: drop the removed `after` zorder form.

## Consequences
Docs match the validator. No code changes; version/doc-only round.
