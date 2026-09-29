# ADR-0801: Equal-ts arbitration tests sample the clock once

- Status: Accepted (2026-09-28, v1.7.827) — test-only

## Background

The ADR-0698 pageName arbitration test called `Date.now()+1e3` per
`applyRemote`. The premise is *equal* ts on every op so peer-id order
decides — but a millisecond tick between the four calls made them unequal,
flipping the expected outcome and failing intermittently (~1/50 runs).

## Decision

Sample once: `const T0=Date.now()+1e3` feeds all four ops. The docName
tie test already used a literal `ts:7` and needed no change.

## Consequences

The arbitration test is now deterministic — it exercises equal-ts
ordering on every run instead of accidentally exercising the ts-compare
fast path whenever a boundary tick intervenes.
