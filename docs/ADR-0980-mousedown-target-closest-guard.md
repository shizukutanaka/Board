# ADR-0980: guard `e.target.closest` on the ctx-menu outside-click path

Status: accepted (2026-10-01, v1.8.006)

## Context

ADR-0909 hardened `e.target.matches()` on the window-level paste/keydown
gates: an event whose target isn't an `Element` — e.g. the `Document`
node (clicks on document chrome, synthetic assistive-tech events) — has
no `matches` method and the TypeError propagates out of the listener,
killing every handler behind it in the dispatch.

The document-level `mousedown` outside-click handler that dismisses the
context menu had the same shape: `e.target.closest('.ctx-menu')` throws
when `e.target` is a non-Element node. A single such event wedges the
listener — the menu stays open and, more importantly, the exception
escapes the dispatch loop.

## Audit of `e.target` / `e.currentTarget` sites

| Site | Verdict |
|---|---|
| `e.target.matches?.` (paste/keydown, 2 sites) | already guarded (0909) |
| `e.target.blur()` inside the `matches?.` branch | only reachable for Elements |
| `e.currentTarget.getBoundingClientRect()` | always the bound element |
| `e.target.files`/`e.target.value` (file input `onchange`) | always the input |
| `e.target.id` (help/share overlay backdrop) | plain property read — safe |
| `e.target.closest('.ctx-menu')` (document mousedown) | **unguarded → fixed** |

## Decision

`e.target.closest?.('.ctx-menu')` — a non-Element target evaluates to
`undefined` (falsy), i.e. "not inside the menu", which is the correct
outside-click semantics: the menu still closes, no exception is thrown.

Behavioural pins drive the real listener through `fakeDoc._L`:
non-Element target does not throw and still closes the menu; a target
inside `.ctx-menu` keeps it open. The pre-existing 0607 source pin is
updated to the guarded form.
