# ADR-0977: proto-key pollution gate — audit complete

Status: accepted (2026-10-01, v1.8.003)

## Context

`JSON.parse('{"__proto__":{...}}')` produces `'__proto__'` as an **own
enumerable data property** — not a prototype link. Two later hazards follow:

1. `Object.assign(target, src)` / `for..in` + assignment write `target.__proto__ = v`,
   which invokes the `__proto__` **setter** on any target with a normal
   prototype chain — silently replacing the target's `[[Prototype]]` when `v`
   is an object. A remote op/import could then shape lookups (`s.x` falls
   through to `{evil:1}`) or break builtin methods.
2. The own data prop survives `JSON.stringify` round-trips, propagating through
   `clone()`, exports, snapshots, and backups.

## Audit

Every remote/local parse path that reaches a write was walked:

- **Patches**: `validPatch` → `_cleanVal(p,0)` walks `_ok(v)` at every depth
  (≤8) and rejects any own key `'__proto__'`, `'constructor'`, or
  `'prototype'`. Every patch application site (`_oa` = `Object.assign`,
  `for..in` merge loops) is reached only *after* `validPatch`/`validShape`.
- **Shapes**: `validShape` delegates to `validPatch` → same `_cleanVal` gate.
  All remote shape entry (`add`/`addMany`/`replace`/`clear`/`pageAdd` shapes)
  and all importers (`importFromHash`, `importBoardText`, `excToShapes`,
  `svgToShapes`, `drawioToShapes`, `Persist.load`) run `validShape` or
  `validPatch` per object before attach.
- **Clock maps**: `for(const k in rw)` / `for(const p in m)` writes land in
  `_wM()` null-prototype buckets (ADR-0788) — a `'__proto__'` key there is a
  harmless own data key; the clock-merge loop at 8291 additionally skips
  `'__proto__'`/`'constructor'`/`'prototype'` explicitly.
- **Stores**: all `id`/`groupId`-keyed `{}` stores were null-proto'ed in
  ADR-0975, so writes into them can't invoke the setter either.
- **Spread/destructure**: `{...s}`, `_attachShape` (rest/spread), and
  `Shape.make` use `CreateDataProperty` semantics — they copy an own
  `'__proto__'` as a plain data key, never invoking the setter. `clone()` =
  `JSON.parse(JSON.stringify(x))` likewise preserves it as data.

Remaining non-issue: an own `'__proto__'` data prop on a *shape* is only
reachable if the shape bypassed `validShape` — no such entry exists. Undo-stack
patch objects are locally produced (never parsed), so they carry no forged
keys either.

## Decision

No code change — the `_cleanVal` gate plus null-proto stores already cover
every parse→write path. Behavioural pins lock the contract:

- `JSON.parse` does produce an own enumerable `'__proto__'` key (the premise).
- `validShape` rejects a shape carrying `'__proto__'` at top level and nested
  inside `aF`.
- A forged `upd` op whose `after` patch carries `'__proto__'` is rejected at
  the real `Net._onRecv` intake — shape value and `Object.getPrototypeOf`
  both untouched; a subsequent legit `upd` still applies.

## Consequences

Any future parse→apply path that writes parsed keys onto a normal-prototype
object must either go through `validPatch`/`_cleanVal` or use a null-proto
target. Exporter/parser additions must not relax the reserved-key check.
