# ADR-0880 — toast stack cap behavioural pins

## Status
Accepted · implemented v1.7.906

## Context
ADR-0879 bounded `UI.toast`'s stack at 4 entries (a burst of toasts — remote
op concentration, repeated errors — used to pile divs until each ~1.8s
self-remove fired, burying the canvas). The fix shipped with a static source
pin only, leaving the eviction ordering (oldest-first) and the ADR-0389
identical-text dedup unpinned — a future refactor could silently reorder or
drop them.

## Decision
Exercise the real `UI.toast` against a recording stub stack element
(`_els['toasts']`): `st.children` is a live array, `st.appendChild` pushes
into it, `lastElementChild` is a getter over it, and each created div's
`remove()` splices itself out — so the `while(children.length>=4) remove
children[0]` loop terminates only when the cap logic actually runs.

Pinned behaviour:
- **Bounded**: 6 consecutive toasts leave exactly 4 children.
- **Oldest-first**: `kids[0].textContent==='t2'` — the two oldest ('t0','t1')
  were evicted, not the newest.
- **Dedup preserved**: two identical 'dup' toasts still yield one entry
  (ADR-0389 re-append semantics unchanged).

## Consequences
test.mjs 2906→2909; no runtime change. The fake-stack pattern is reusable for
other DOM-output bound tests (e.g. announce, page-tab rebuilds).
