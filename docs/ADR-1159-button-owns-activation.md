# ADR-1159: a focused control owns its activation keys

Status: accepted (v1.8.183)

## Context

The window-level keydown router early-returns for two target classes:
`input,textarea` (typing owns its keys) and open dialogs (`_openDialog()`
focus trap). Everything else is treated as "the canvas owns this keypress".

That asymmetry was wrong for `<button>`: a button natively activates on
Enter/Space, and the DOM is full of them — toolbar tools, style swatches,
dialog buttons, mirror entries. With focus on any button:

- **Enter** → the router called `_pd(e)` (suppresses the native click) and
  ran the canvas action: `editSelectedShapeKbd()` — opening a *second* text
  editor — or `createShapeKbd()` — stamping a shape at view center. On the
  repeat whitelist it also passed `!meta&&k===_EN`, so *holding* Enter on a
  button re-stamped shapes.
- **Space** → native click fires *and* the router armed temporary hand
  (`pickTool('hand',true)`) with `_prevTool` recorded; the space-keyup
  restore then silently flipped the tool back — a tool switch the user
  never requested, attached to a button press.

Socratic check on coverage: `input,textarea` was already covered. No
`contenteditable`, `<select>` or DOM `<a>` elements exist (anchors appear
only inside SVG export strings), so `button` completes the native-activation
surface. Modal buttons were already unreachable (the `_dlg` trap returns
first); presentation mode swallows keys before this seam. The guard's job is
exactly the gap that remained: chrome-level buttons while no dialog is open.

## Decision

One line, placed after the dialog trap and before the repeat gate:

```js
// ADR-1159: a focused control owns its activation keys — Enter/Space on a
// button must activate the button, not the canvas action underneath.
if(e.target.matches?.('button')&&(k===_EN||k===' '))return;
```

The native click proceeds unsuppressed (no `_pd`), the button's own handler
runs, and no canvas action fires.

## Consequences

- Enter on a focused toolbar/style/dialog button now does exactly what the
  button says — no phantom shape stamp, no stray text editor.
- Space on a focused button no longer leaves the tool on hand-then-restored;
  `_prevTool` stays untouched.
- Non-button targets are unaffected: Enter still stamps/edits, Space still
  arms temp-hand (behavioural pins cover both directions).
- Residual, out of scope: inside `_pA()` presentation mode Space maps to
  `Presentation.next()` — a focused pres-exit button would fire next()+leave.
  That path is gated *before* this seam and is nav-by-design there.
