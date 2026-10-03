# ADR-1007: held-key auto-repeat gates to the continuous action set

## Status

Implemented (v1.8.033).

## Context

A held keyboard key fires `keydown` at the OS repeat rate (~25–30/s). The
window-level `_KD` handler had **zero** `e.repeat` filtering — every
action, continuous or discrete, ran once per repeat tick. Prior work
already made op-emitting held keys safe (ADR-0957–0961 `_nugPush`
coalescing: move/zorder/style/flip/lock/group/rotate fold into one op per
key session), but three classes remained exposed:

1. **Parity toggles** — each repeat flips the state, so the final state is
   parity-random and the UI visibly oscillates during the hold:
   `toggleGridView` (`g`), `toggleSnapMode` (`⇧G`), `UI.toggleMinimap`
   (`m`), `toggleSq` (`⌘F`), `UI.toggleHelp` (`?`), `selectInverse`
   (`⌘⇧I`), `toggleTextFlag` (`⌘B/⌘I/⌘U/⌘⇧X`), `doFlip` (`⇧H/⇧V`),
   `swapFillStroke` (`⇧X`), `doLock` (`⌘⇧L`). The `_nug`-folded ones
   stayed internally consistent but still flapped live.
2. **One-shot spam** — every repeat commits/downloads again:
   `exportPNG`/`exportSVG`/`exportPDF`/`exportBoard` (4 download
   spams), `wrapInFrame` (`⌘⌥G` — nests a fresh frame inside the previous
   one per tick, un-`_nug`ed direct `_cOp`), `doUngroup` (`⌘⇧G` — direct
   `_recordCommitted` + warn-toast), `createShapeKbd` (`Enter` — stamps a
   shape per tick), `doBeautify` (`⌥B`).
3. **Intended-continuous** — must keep repeating: undo/redo, arrow
   nudges + no-selection pans + `⌥`-resize, `⌘±/0` zoom, `,`/`.`/`⇧R`
   rotate, `[`/`]`/`⇧[`/`⇧]` zorder, `⌘⇧,/.` fontSize, `⌘D` duplicate
   cascade, `⌘⇧V` paste-in-place cascade, `Tab`/`PgUp`/`PgDn`/`Esc`
   (layered dismiss), `Space`/tool keys (idempotent `pickTool`), digits
   (idempotent opacity), `⌘A`/`⌘C`/`⌘X`/`⌘⇧H` (idempotent or
   self-limiting).

Figma/Excalidraw convention matches this split: continuous transforms
repeat, discrete commands don't.

## Decision

One gate, placed in the `_KD` handler after the dialog isolation block
and before the action chain:

```js
if(e.repeat){
  const B=meta?'fepibu':_aK(e)?'b':'gm?/';
  if(B.includes(k)
   ||(!meta&&k===_EN)
   ||(meta&&((_sK(e)&&'xsgl'.includes(k))||_aK(e)&&e.code==='KeyG'))
   ||(!meta&&_sK(e)&&!_aK(e)&&'hvx'.includes(k)))return;
}
```

- `meta` set `fepibu`: `f`=search, `e`=PNG/SVG export, `p`=PDF export,
  `i`=italic+inverse, `b`=bold, `u`=underline.
- `meta`+`⇧` set `xsgl`: `x`=strike, `s`=board export, `g`=ungroup,
  `l`=lock.
- `meta`+`⌥`+`KeyG`: wrap-in-frame.
- Non-meta set `gm?/`: `g`=grid+snap (shift folds to `g`), `m`=minimap,
  `?`/`/`=help.
- Non-meta `⇧` set `hvx`: `⇧H/⇧V` flips, `⇧X` swap-fill.
- Non-meta `Enter`: stamps (the `⌘Enter` presentation-enter falls in the
  meta branch and stays allowed — post-enter repeats are suppressed by
  the `_pA()` guard anyway).
- `⌥B` beautify: the `_aK` non-meta branch's sole letter set.

Everything else passes through unchanged — `doGroup` (`⌘G` plain)
deliberately stays allowed since `_nug` merges the run into one
deterministic op; `hideSelection`/`doDelete`/cut self-limit after the
first press.

## Consequences

- Held `g`/`m`/`⌘B`/`⇧H`/`⌘⌥G` etc. apply exactly once instead of
  oscillating or spamming; held `⌘Z`, arrows, `⌘±`, `[`/`]` still
  stream as before.
- Contract: any NEW discrete keydown action must join the blocked set
  (or be idempotent/coalesced); continuous actions stay un-gated.
- Behavioural pins dispatch real `keydown` events with `repeat:true`
  through the recorded window listener.
