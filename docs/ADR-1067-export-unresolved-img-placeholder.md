# ADR-1067: External-format exports render unresolved img refs as their native placeholder

## Status

Accepted — round816, v1.8.090.

## Context

ADR-1042 made `.board`/share-link exports carry a parked `img:` ref through
when the shape has no `dataUrl` — the import side parks it and imgq-heals the
bytes. That left the *external-format* exporters holding a state they were
never written for: an image shape whose bytes haven't arrived yet.

The audit of every export surface:

| Surface | Before | Verdict |
|---|---|---|
| `.board` / share link | ref rides through → heal | correct (ADR-1042) |
| PNG (canvas renderer) | gray placeholder box | correct |
| `.excalidraw` (`excScene`) | `_du(s).match()` → **TypeError, export dead** | **bug** |
| `.drawio` (`_dioCells`) | `shape=image` + `image=` both byte-gated → plain rect | silent degrade |
| SVG (`buildSVG`) | no `<image>`, no box — label only | silent degrade |

The `.excalidraw` one is a real crash: `_du(s)` returns `undefined` for a
ref-only shape and `.match()` on it throws, killing the whole export.

## Decision

1. **`excScene`** materializes first — `const _du2=_du(s)||Net._imgIn.get(s.img)||''`
   (the same lookup `_attachShape` uses; covers the thin window where the blob
   landed in `_imgIn` but the straggler scan hasn't resolved the ref yet). The
   element is always emitted with `fileId`; the `files[fid]` entry is written
   only when bytes exist. A dangling `fileId` is well-formed — excalidraw
   renders its own missing-image placeholder, preserving position, size,
   roundness and the bound caption.

2. **`_dioCells`** emits `shape=image` unconditionally; `image=` stays
   byte-gated. drawio renders its built-in image placeholder (mountains glyph)
   when `image=` is absent, so the cell keeps its "this is an image" identity
   instead of degrading to a rounded rectangle.

3. **`buildSVG`** draws the canvas's exact placeholder — `_sk(s)||'#CBD5E1'`
   1px outline rect (mirroring `drawShape`'s missing-image branch at the
   renderer) — instead of nothing.

The `.board`/share-link path is unchanged: the ref itself is the payload, and
park+heal on the receiving side completes it (ADR-1041/1042).

## Consequences

- Exporting mid-heal (an image parked waiting on imgq) no longer kills the
  whole `.excalidraw` export and no longer silently strips the image's
  identity/geometry from drawio and SVG output.
- Re-importing our own `.excalidraw` file drops a dangling-fileId element
  (its file entry was never written). Accepted: the bytes were never in the
  file, and a `dataUrl:''` shape is model-illegal (validPatch rejects it), so
  there is no honest shape to restore — geometry-only resurrection would be a
  dead placeholder on every peer's board.
- No importer changes: each format's own placeholder convention is the
  honest representation of "image pending".

## Tests

11 asserts in `test.mjs` (`ADR-1067 export placeholder parity`): `excScene`
survives a ref-only shape, emits the element with a dangling `fileId`, and
materializes an `_imgIn` hit into `files`; `.drawio` keeps `shape=image`
without `image=` and keeps `image=` for real bytes; SVG emits the `#CBD5E1`
box for ref-only and `<image>` for bytes.
