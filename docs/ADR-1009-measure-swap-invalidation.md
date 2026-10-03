# ADR-1009: wholesale swaps must invalidate stored measure geometry

## Status

Implemented (v1.8.035).

## Context

ADR-1008 swept the *focus-loss* boundary for transient input-derived
state. This round swept the other invalidator: **wholesale shape-set
replacement** — `_rs` (imports/snapshot ingest) and the `_apply`
'clear'/'replace' branches (remote wholesale ops, undo of swaps).

Audit table — every armed/transient overlay state × swap survival:

| State | Dead-safe? | Verdict |
|---|---|---|
| `state.hover` (quick-conn dots) | id → `byId` null → no draw | ✓ safe |
| `state._ehov` (eraser preview) | id → `byId` null → no draw | ✓ safe |
| `state.bindPreview` | id + `ptr.down`-gated | ✓ safe |
| `state._sbf` slider before-buffer | `id+prop` keys → `byId` null | ✓ safe |
| `state.draft` / `marquee` / `lasso` / `guides` / `readout` | gesture-owned; swaps mid-gesture continue per ADR-0969 | ✓ by design |
| `ptr.lineClick` (click-click pending point) | modal armed — commits a *new* line on second click; survives like blur (ADR-1008) | ✓ deliberate |
| `state.editing` overlays | rebind to live / fold on dead (ADR-0556/0709/0995) | ✓ safe |
| `state.measure` | **stored geometry {a,b} drawn directly — not an id lookup** | ✗ hole |

`state.measure` is the only transient chrome holding *copied geometry*:
`_drawMeasure` renders `m.a`/`m.b` gap guides with no shape lookup. A
remote 'replace'/'clear', a snapshot/import ingest, or an undo-swap
landing mid-measure left stale guides floating over boxes that no longer
existed — repainted every frame until Alt keyup.

## Decision

`state.measure=null` at all three wholesale-swap sites:

- `_rs` — import/snapshot ingest funnel (`state.shapes=_uniq(arr)`),
- `_apply` 'clear' forward — the keep/dead partition wipe,
- `_apply` 'replace' forward+backward — the pre-swap/next swap adopt.

`state.draft` deliberately survives: the live gesture owns it and remote
writes already interleave correctly under ADR-0969. `ptr.lineClick`
likewise — a pending pick-point is a multi-click modal step, not chrome
describing board objects.

## Consequences

- No more ghost measure guides after remote/local wholesale swaps.
- Contract: new transient chrome must either resolve shapes by id at
  draw time (dead-safe), live inside a gesture/focus-loss funnel, or be
  cleared at the swap sites.
- Behavioural pins: real `applyRemote('replace')` and `commit('clear')`
  both drop a seeded `state.measure`.
