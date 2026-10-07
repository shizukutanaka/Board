# ADR-1101 — export-pipeline completeness audit + exportPDF empty-page toast parity

Date: 2026-10-01 (round851)
Status: accepted (shipped in v1.8.125)

## Context

Audit round851 covered the whole export egress surface — PNG (board/viewport/
selection/copy), SVG, PDF, `.board`, `.excalidraw`, `.drawio`, share-URL, and
clipboard paths — against the established contract axes: hidden parity
(ADR-0137/0593/0594/0678), page scope (0658), remote-string escaping
(0326/0861/0889), input bounds (0039/0325/0398), parked-img behaviour
(1042/1067), and born-clock convergence on the import side.

## Audit findings

- **Hidden parity — clean.** `drawShape`'s `_hd` guard skips hidden shapes at
  the draw level, covering every canvas-driven export (PNG, viewport PNG,
  PDF). `buildSVG`, `excScene`, and the drawio emitter filter `_sv`/`_hd` at
  the scene level. `_shV()` (visible + current-page) feeds every single-page
  exporter.
- **Page scope — clean.** All single-scene exports read `_shV()` or
  `_pgOk`-filtered lists; `.board`/`.excalidraw` carry full multi-page sets by
  design (the format round-trips pages).
- **Escaping — clean.** `_esc` covers `&<>"'` for SVG/badge markup; the drawio
  emitter uses `_dioEsc`/`nl`; `s.link` is already http(s)-gated at intake
  (0326), so the export side re-escapes safely.
- **Bounds — clean.** Share-link ceiling (0039), 32MB import guard (0398),
  compressed-drawio inflation bound (0325) all hold.
- **Born clocks on import — clean.** `.board` payloads intentionally carry no
  `wc` map (portable content, not a wire snapshot); a replace import lands
  through `_repC` → `Store._recordCommitted`, which stamps `_bT(s.id,
  op.clock)` on every after-shape and `_wD` on removed before-shapes — the
  same tomb/born parity a remote `replace` applies. Clockless file → fresh
  clocks at adopt, no stale-del window.
- **Parked `img:` refs — clean.** Exports ride refs through (1042) and render
  materialized placeholders instead of crashing (1067).

## Defect found and fixed

`exportPDF` was the only silent path: it gated on `_nS()` (any shapes at all)
but a second `_bA(_shV())` null — e.g. shapes exist but all hidden or all
off-page — `return`ed with no feedback. Every sibling path toasts
`_wT(_EM)` ('empty') in that situation: `_renderPngBlob` (:6650), the
viewport path (:6684), `exportSVG` via `buildSVG===null` (:6727/6774),
`.board` (:6783), `.excalidraw` (:7154), `.drawio` (:7270). The PDF gate now
toasts identically:

```js
const b=_bA(_shV());if(!b){_wT(_EM);return}
```

## Pins

- exportPDF on a hidden-only board (shapes exist, none visible) emits a warn
  toast carrying the `empty` message instead of silently returning.
