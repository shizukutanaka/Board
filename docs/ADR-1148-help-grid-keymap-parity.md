# ADR-1148 — help grid × keymap parity: every real shortcut is documented

Status: Accepted (v1.8.172, round898)

## Context

ADR-1147 closed the last *menu-reachability* gap. The adjacent
discoverability surface is the `?` help grid (`fillHelp`): if a live
keybinding is absent from it, users can't learn it except by accident.
An op that exists but is undocumentable-by-omission is the same class of
invisibility ADR-0135 warned about — here the direction is
code→documentation instead of keyboard→menu.

Sweeping the keydown handler (`INPUT`) and the gesture modifiers
against `fillHelp`'s rows found ten deltas:

| binding | behavior | before |
|---------|----------|--------|
| ⌘⇧G | ungroup | group row named ⌘G/⌘⌥G only |
| ⌘⇧I | invert selection | absent |
| ⌘Y | redo (Windows convention) | absent |
| ⌘Enter | present / search select-all / sticky chain | absent (three contexts) |
| ⇧ + wheel | horizontal pan | absent |
| ⇧ + click | selection toggle | absent |
| ⌥ + drag | duplicate-drag (on shape) *and* lasso (on empty) | lasso only |
| ⌥ + hover | gap-measure guides | absent |
| ⌥ + click | waypoint delete / trunk recentre / labelPos midpoint | absent |
| long press | ctx menu on touch | absent |

## Decision

Add every missing row, reusing existing i18n keys where possible
(`ctxUngroup`, `ctxSelectInverse`, `dup`, `present`) and adding seven
new keys for previously unnamed concepts (`selAllMatch`,
`stickyChainKey`, `hPan`, `gapMeasure`, `waypointEdit`, `selToggle`,
`ctxMenuKey`) — ja+en parity. `⌘Enter` gets one row naming all three
contexts (present on canvas, select-all-matches in search, sticky-chain
in the editor); `⌥ + drag` is relabeled `dup / lasso` since the binding
is dual (duplicate on a shape, lasso on empty canvas).

No behavior changes — this is a documentation surface closing on
already-shipped bindings.

## Consequences

- `?` now enumerates every keyboard/gesture shortcut in the app.
- New keys are help-scoped; no other UI surface changes.
- 12 behavioural pins: each new row exists, new keys exist in ja+en,
  and each documented binding has a live handler in the keymap/gesture
  code (so the grid can't drift ahead of the implementation either).
