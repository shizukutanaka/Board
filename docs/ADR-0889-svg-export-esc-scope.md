# ADR-0889: SVG export called undefined `esc()` — linked boards crashed the export

Status: Accepted (implemented, v1.7.915)

## Context

`buildSVG` emits a clickable `<a href>` link badge on any shape carrying
`s.link` (ADR-0333/0339) — three sites: connectors, pen strokes, box shapes.
All three interpolated `${esc(s.link)}` into the href attribute.

`esc` is a *local* alias: `const esc=_dioEsc` declared at the top of the
drawio emitter (~line 7140). Inside `buildSVG` it is not defined — the
identifier resolves up to module scope where no `esc` exists.

## Bug

Any board containing a shape with `s.link` → `esc(s.link)` throws a
ReferenceError → the throw propagates out of `buildSVG` → the export
fails entirely (callers toast `exportFailed`). The feature was dead for
every linked shape since the `<a>` sites were introduced — the drawio
`esc` shadow masked the mistake from source-level review.

## Fix

All three sites now call the module-level `_esc(s.link)` — the same
escaping used by every other SVG attribute and text node in `buildSVG`
(`&` `<` `>` `"` `'`). The href is additionally scheme-gated upstream:
`s.link` is `https?://`-validated at `validPatch` intake (ADR-0326) and
the local link editor applies the same gate, so no `javascript:` can
reach the exported file.

The ADR-0333 source pin in test.mjs was updated to the `_esc(` literal;
it now fails if any badge site loses the `_esc` prefix again.

## Consequences

- +3B net (+6 chars `// ADR-0889` on three comment tails, −3×1 char).
- Rule recorded: emitted attributes inside `buildSVG` always escape via
  `_esc`; `esc`/`nl` are drawio-emitter locals and must never leak into
  SVG scope. A module-level identifier that is only ever assigned inside
  a nested function is a latent ReferenceError everywhere else — worth a
  periodic sweep (`\besc\(` outside the drawio block now matches zero).
