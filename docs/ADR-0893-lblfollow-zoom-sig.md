# ADR-0893: Label-editor follow signature reads v.zoom, not v.z

Status: Accepted (implemented, v1.7.919)

## Context

`_lblFollow`'s per-frame signature was `v.x+'|'+v.y+'|'+v.z+'|'+_gridVer`.
`state.viewport` is `{x,y,zoom}` — `v.z` is `undefined`, a constant in
the signature. Zoom therefore never re-triggered the label follow pass:
zoom while a label editor is open left the input anchored at the old
screen position until the next `_gridVer` bump or blur. The sibling
`_teFollow` has always read `v.zoom`.

## Decision

`v.z` → `v.zoom` in the `_lblFollow` signature. With ADR-0892's
`_gridVer` component the sig is `x|y|zoom|gridVer` — the same coverage
as the text editor (viewport + any shape mutation).

Swept the viewport-alias namespace (`v`, `pv`, `ev`, `cv`, `nv`) for
the same class of typo: every remaining prop access is `x`, `y`,
`zoom`, or a legit receiver (`cv.toDataURL`, `v.every`, `v.id` in
`_cleanVal`/`_sT`). No other `v.z` survives.

## Consequences

- Label editor now re-anchors on wheel/pinch/zoomAt zoom changes like
  the text editor — closes the residual gap ADR-0892 couldn't see
  (zoom does not bump `_gridVer`).
- Net +~90B of comment for the fix note; raw stays under the ceiling.
