# ADR-0946: Reject negative w/h extents at the patch intake gate

## Status

Accepted (2026-10-01)

## Context

`validPatch` bounds every numeric geometry field for finiteness and
magnitude (`_xyOK`, ADR-0792) and ranges for size/fontSize/opacity
(ADR-0868), but it never checked the *sign* of `w`/`h`. Every local
producer either normalizes (`beginRectLike`: `if(w<0){x+=w;w=-w}`) or
clamps (`applyResize`: `w=_max(clamp,…)`) — a negative extent can only
ever arrive through untrusted intake: wire ops, snapshots, importers,
IDB restore.

What a negative extent does downstream:

- **hit-test dead**: `p.x>=s.x && p.x<=s.x+s.w` is an empty interval when
  `w<0` — the shape can't be picked, marquee-selected, moved, or erased;
- **mirrored draw**: canvas `fillRect(x,y,w,h)` with `w<0` paints toward
  the negative axis — the shape is *visible* but untouchable;
- **bbox degenerate**: `b.w>0` checks make it invisible to fit/zoom and
  the SR mirror;
- **frame containment forgery**: `_fOf`'s `s.x+(s.w||0)<=f.x+f.w` is
  trivially satisfied — a poison shape silently counts as a frame member
  and is dragged when the frame moves.

Net effect: a hostile (or corrupted) op lands a permanent,
interaction-dead shape on *every* peer — converged but poisoned.

## Decision

One line in `validPatch`, after the `_xyOK` loop (w/h are guaranteed
finite numbers or absent at that point):

```js
if(p.w<0||p.h<0)return false;   // ADR-0946: extents can't be negative
```

`w:0`/`h:0` stay accepted — degenerate but normalized (same class as a
zero-size draw today). Positions (`x`,`x1`,`y2`,`bend`) keep the
magnitude-only bound — negative coordinates are legitimate positions.

Because `validShape` → `validPatch`, the same gate now covers `add`,
`addMany`, `del`/`clear`/`replace` snapshots, `upd`/`style`/`move`/
`resize`/`beautify`/`align` patches, file importers, and IDB restore —
one line, every intake.

## Consequences

- Forged `upd{w:-50}`/`{h:-1}` and `add{w:-10}` ops are dropped at
  `validRemotePayload`; the board is untouched.
- Behavioural pin (4 asserts): real `Net._onRecv` intake — negative
  `upd` and `add` rejected, `w:0` still applies.
- pass count: 3021 → 3025. raw 557,054B (ceiling 557,056B).
