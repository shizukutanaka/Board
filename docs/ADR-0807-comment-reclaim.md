# ADR-0807: Comment-tail reclaim

- Status: Accepted (2026-09-28, v1.7.833)

## Decision

After ADR-0806 left ~5B of headroom, trim two verbose comment clusters
(the endpoint pin/detach preamble and the typography-cycle preamble)
into single-line ADR references: ~870B reclaimed (557,051 → 556,180B).
No behaviour change; ADR cross-references preserved in compressed form.
