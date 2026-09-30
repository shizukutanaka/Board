# ADR-0812: Presence-gate behavioural pins

- Status: Accepted (2026-09-28, v1.7.838)

## Decision

Pin the presence intake gates (ADR-0811 audit) behaviourally through
`Net._onRecv`: `hello` registers the peer, a non-numeric cursor coord
is rejected, valid coords are stored, `h:1` hides the cursor, and an
oversized peer id is refused before `_touchPeer`. The anonymous-peer
model plus per-field bounds are now regression-pinned.
