# ADR-0956: SR mirror rebuild restores the focused slot

## Status
Accepted — implemented (fix + behavioural pins).

## Context
`_mirrorSync` rebuilds `<ul id="shapeMirrorList">` wholesale on every `_gridVer` bump
— i.e. on **every remote op** that lands. The rebuild deletes and recreates every
`<li><button>`, so a keyboard/screen-reader user who was focused on a mirror button
lost focus: `document.activeElement` collapsed to `<body>` and the reader's position
in the shape list was destroyed on each incoming op — a denial of SR navigation
while any peer is editing.

ADR-0675 solved the same defect class for the page-tab strip by keying the rebuild
on a content signature **and** restoring focus by index. The mirror can't take the
signature shortcut: its labels embed the shape's position via `describeShape`
(`"1. rect @ x,y"`), so any shape move changes content — the list must rebuild.
The remaining parity gap was the focus half of 0675, which the mirror never got.

## Decision
Save the focused button's **index** before the wholesale rebuild and refocus the
same slot afterwards, clamped to the (possibly shrunk) list length:

```js
const ae=_aE(),fi=ae&&ul.contains(ae)?_ix(_qsa(ul,'button'),ae):-1;
while(ul.firstChild)ul.removeChild(ul.firstChild);
// ... rebuild ...
if(fi>-1){const bs=_qsa(ul,'button');if(_ln(bs))_fc(bs[_min(fi,_ln(bs)-1)])}
```

- Index (not shape id) is the anchor: the list is positional for SR users —
  landing back on "item 3 of 10" matches the mental model better than silently
  hunting for a moved shape's new label.
- `fi=-1` (focus elsewhere) keeps the zero-cost fast path.
- Clamp `min(fi, len-1)` covers a shrink during the same bump (e.g. a remote del
  or page switch reduces the item count); `len===0` needs no focus.

## Why not a stable-key keyed diff?
Reconciling by shape id preserves the *node* and its focus, but costs a Map +
per-item matching pass on every `_gridVer` bump — the frame-loop hot path
(`_mirrorSync` is called from `frame()`). The index save/restore is O(list length)
in the same pass the rebuild already pays, and matches the ADR-0675 page-tab
precedent.

## Pins (test.mjs)
The `fakeUl` DOM stub gained `contains`/`querySelectorAll`/`focus` and asserts:

1. Focused mirror button survives a `_gridVer` rebuild — focus lands on the new
   button node at the same index (not `body`).
2. Rebuild replaces the button node (the fix restores focus, it doesn't prevent
   the rebuild — labels embed positions so rebuilds stay necessary).
3. Shrinking the list while the last item is focused clamps focus to the new
   last slot.

## Byte budget
~165B of new code paid for by compressing 9 verbose `// ADR-…` comment tails
elsewhere (content preserved, wording tightened). Raw after the change: 557,045B
vs. the 557,056B ceiling.
