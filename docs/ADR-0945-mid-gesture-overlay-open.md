# ADR-0945: Opening an overlay mid-gesture cancels the live pointer drag

## Status

Accepted (2026-10-01)

## Context

ADR-0634 and ADR-0637 established the rule: before an overlay opens that
will hide the canvas, any in-flight pointer gesture is cancelled first.
Without the cancel, the gesture keeps its `setPointerCapture` — pointer
move/up events still dispatch to the canvas, so the drag commits
*invisibly underneath the modal*:

- a box draw (rect/ellipse/diamond/frame/sticky/text) completes with the
  overlay covering the result — the user never sees where it landed;
- a select move-drag keeps mutating the shape in place and commits a
  `move` op the user could not aim.

The gesture-cancel convention is applied at every overlay/presentation
entry: `Presentation.enter()` (0634), the Enter-edit open (0637),
contextmenu (4492), Esc (5962), ⌘Z/⌘Y (5865), blur / hidden / pagehide /
lostpointercapture, page switches, and mid-drag tool keys are gated the
other way (ADR-0942).

Audit of the remaining key-reachable overlay opens found two holes:

- `?` / `⇧/` → `UI.toggleHelp()` (5980) — opens the help modal;
- `⌘F` → `toggleSq()` (5983) — opens the search box.

Neither touched `ptr.down`: pressing either while dragging left the
gesture alive and its release committed under the overlay — the same
defect class 0634/0637 closed.

## Decision — cancel inside the open functions, not at the key site

`toggleSq` and `UI.toggleHelp` each gained
`if(ptr.down)_cancelPointerGesture();` inside their *open* branch:

```js
// toggleSq (6006)
if(sq.style.display!=='none'){if(ptr.down)_cancelPointerGesture();_fc(sq);sq.select();}
// UI.toggleHelp (8996)
if(open){if(ptr.down)_cancelPointerGesture();this._captureFocus();_fc(_g('helpClose'))}
```

Placing the cancel inside the open functions (rather than at the two key
dispatch sites) mirrors the 0634 choice in `Presentation.enter()`: every
current and future open path — the ctx menu's `ctxSearch` entry, the help
toolbar buttons — is covered uniformly, and the call is a harmless no-op
when no gesture is live. Unlike `pickTool` (0942), these functions have
no legitimate mid-gesture call to preserve.

Byte budget: the two guard calls (+72B) were paid for by compressing the
ADR-0565 comment tail (−38B).

## Consequences

- `?` and `⌘F` pressed mid-drag now abort the drag the same way Esc,
  the context menu, or presentation entry do — geometry is `_geoR`
  restored, the draft is dropped, nothing commits invisibly.
- Behavioural pin (8 asserts): a rect draw armed via real dispatch, then
  `fireKey('f',{metaKey:true})` / `fireKey('?',{shiftKey:true})` — the
  gesture is dead, no shape commits, and the overlay opens.
- pass count: 3013 → 3021.
