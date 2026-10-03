# ADR-0982: Detached focus-restore targets fall back to canvas

## Status
Accepted (v1.8.008, round731)

## Context
`UI._captureFocus`/`_restoreFocus` (ADR-0215) and the presentation
`_focusTrigger` save the element that was focused before a modal or the
slideshow opened, then `focus()` it on close. Remote ops are applied while
overlays are open — a `pageAdd`/`pageDel`/snapshot can rebuild the page-tab
strip (`_pgTabs`) or the SR mirror mid-open, replacing the saved element with
a fresh node. `focus()` on a disconnected element is a silent no-op, so the
restore did nothing and focus dropped to `<body>` — losing the keyboard
user's place (WCAG SC 2.4.3 / focus-order).

This round also audited the neighbouring surfaces and found them clean:

- `URL.createObjectURL` sites (PNG/PDF/.board/excalidraw/drawio exports, SW
  registration) all revoke via `_rO` (10s-delayed revoke) or Promise-settle —
  no blob-URL leak.
- No `innerHTML=`/`insertAdjacentHTML` anywhere (pinned since the resource
  scan).
- `_focusables(_dlg)` is re-queried on every Tab press, so the trap is
  dynamic-DOM safe by construction; dialog children that can be focusable
  are all in the selector and `el.hidden` covers the only `hidden` members.

## Decision
At each restore site, check `isConnected===false` and focus the canvas —
the app's natural focus root — instead of the dead node:

```js
_restoreFocus(){const p=this._prevFocus;this._prevFocus=null;if(p&&p.focus)_fc(p.isConnected===false?canvas:p)},

_focusTrigger&&_fc(_focusTrigger.isConnected===false?canvas:_focusTrigger);
```

`===false` (not falsy) keeps the check a no-op for stubs and exotic hosts
that don't expose `isConnected`.

## Consequences
Keyboard focus returns to a usable element on every restore path. Pins:
behavioural `UI._restoreFocus`/`Presentation.leave` with detached vs
connected targets (4 asserts) + source pins for both sites.
