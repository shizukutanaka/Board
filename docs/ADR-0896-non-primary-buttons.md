# ADR-0896: Non-primary pointerdown buttons must not arm gestures

Status: Accepted (fix, v1.7.922)

## Context

ADR-0532 rejected `e.button===2` (right click) so the macOS context menu
could not arm `ptr.down`. The audit of pointer buttons found the guard
was too narrow: `e.button` is `3`/`4` for the mouse X1/X2 side buttons
and `5` for stylus barrel buttons — all of which fell through to the
tool switch and armed a pen/marquee/drag gesture. On a select-tool side
button press, the canvas captured the pointer and started a marquee the
user never intended; pen tools inked a stroke.

## Decision

Widen the early return to `if(e.button>1)return;`. Middle click (1)
still reaches the pan branch; only the primary button (0) and the
primary-contact/pan buttons arm gestures.

## Consequences

- Mouse X1/X2 (back/forward) and stylus barrel buttons are inert on the
  canvas — matching every mainstream whiteboard's button policy.
- Source pins updated: the ADR-0532 pin now asserts `e.button>1`.
