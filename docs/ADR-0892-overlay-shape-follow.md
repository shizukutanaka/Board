# ADR-0892: Edit overlays follow shape changes, not just the viewport

Status: Accepted (implemented, v1.7.918)

## Context

`_teFollow` / `_lblFollow` re-position the open text/label overlays once
per frame, gated on a signature of the viewport only
(`v.x,v.y,v.zoom`). A remote `upd`/`move`/`style`/`resize` op that
moved or restyled the edited shape bumped `_gridVer` but left the
signature unchanged — the overlay stayed glued at the stale screen
position with the stale font/size/colour while the shape rendered
elsewhere. Same class as ADR-0559 (fold on removal): the overlay must
track the live shape, not a snapshot taken at open.

## Decision

Add `_gridVer` to both follow signatures. Every shape mutation bumps
`_gridVer` (it is the cache-invalidation counter the render pipeline
already maintains), so any prop change — position, size, font, colour,
route, labelPos — re-triggers the follow pass:

- `_teFollow`: `sig=v.x+','+v.y+','+v.zoom+','+_gridVer` →
  `positionTextEditor` already rewrites left/top/fontSize/colour/family/
  spacing/lineHeight from the live shape.
- `_lblFollow`: same `_gridVer` join. The follow pass now anchors from
  the live `byId` shape (was `_lblTa.hit`, the object captured at open)
  and re-applies font / letter-spacing / text-decoration / colour —
  parity with the open-time cssText (ADR-0862/0874).

## Consequences

- A peer dragging or restyling a shape mid-edit keeps the overlay
  anchored and styled to match the render; no stale-ghost editor.
- Cost is one string build + compare per frame while an editor is open
  — `_gridVer` joins the existing signature instead of enumerating the
  shape's prop list (that variant cost ~950B over the size ceiling).
- Size: net +~140B after comment-tail reclaim (-~550B).
