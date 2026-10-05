# ADR-1020: user-driven viewport mutations schedule a save

- 日付: 2026-10-01
- 状態: Accepted
- Round: 769 (おまかせ改善)

## Context

The doc record stored in IndexedDB carries a `viewport` field and the boot
path restores it (ADR-0106 boot guard). But persistence is only scheduled by
`Persist.schedule()` (`_ps()`) — and until this round the call sites were
ops, docName edits, page switches, and snapshot/import intake. Pure
view-state movement never reached it:

| Mutation site | Persisted before? |
|---|---|
| `zoomAt` (wheel / pinch / zoomBy / fit keys) | no |
| Hand-drag pan (`ptr.panning`) | no |
| Edge auto-pan (`_edgePanTick`) | no |
| Wheel pan (plain + ⇧ horizontal) | no |
| Arrow-key pan (no selection) | no |
| Minimap scrub (`_mmGo`) | no |
| `_fitViewport` (⇧1 / ⇧2 / fitToContent) | no |
| `zoomReset` | no |
| `centerOn` (search / mirror nav) | no |
| Presentation `leave()` (`_savedVp` restore) | no |

Result: a pan/zoom-only session persisted nothing — reload, tab-hide
(`flushIfHidden` only saves when dirty), or crash snapped the board back to
the viewport captured by the *last unrelated op save*. The viewport-restore
feature half-worked.

ADR-0674 already established that view-state changes persist ("page switch
schedules persist so the last page survives reload") — the viewport is the
same class and had simply never been wired in.

## Decision

Append `_ps()` to every user-driven viewport-write site (10 sites). The
presentation's internal `_zoomToFrame` is deliberately excluded — its writes
are transient chrome; `leave()` restores `_savedVp` and then schedules, so
the *restored normal* viewport is what persists, never a frame-fitted one.

Cost is nil: `Persist.schedule()` is a 500 ms trailing-edge debounce — a
`_ps()` call per pointermove frame just re-arms the timer, exactly as op
commits already do.

## Consequences

- Pan/zoom-only sessions now persist; reload/restore lands on the real last
  viewport.
- `flushIfHidden` now saves on hide even without ops, since schedule()
  marks dirty (ADR-0973).

## Contract

New viewport mutation paths must reach `_ps()` — either inline at the write
site or inside a funnel that already schedules. Transient viewport writes
inside Presentation stay unpersisted; `leave()` owns the post-restore save.
Pinned in test.mjs (6 asserts).

## Byte note

~61 B added; offset by compressing two comment blocks near the edited
sites (net −45 B).
