# ADR-0834: pageAdd member shapes gate on the page landing

- Status: Accepted (2026-09-28, v1.7.860)

## Problem

A remote `pageAdd` rejected at the 64-page cap
(`else if(!l&&_ln(_pgs())<64)`) still pushed its member shapes with
`c2.pg=op.id` — invisible shapes pointing at a page the receiver
doesn't have. Unhealable: `_pgHealS` won't create '?' stubs past
the same cap, so the orphans linger in `_sh()` forever, counted in
exports/persistence but never drawn or selectable.

## Fix

Member application now requires `_pgById(op.id)` after the page
step — a `pageAdd` that can't land drops its members with it, so
all receivers converge on "the op didn't apply" instead of
silently accumulating phantom shapes. Landed pages (first page,
stub upgrade, under-cap insert, existing id) still get members
exactly as before.
