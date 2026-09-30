# ADR-0890: Behavioural pins — zero-extent group-resize map + audit sweep

Status: Accepted (implemented, v1.7.916)

## Context

ADR-0888 guarded `_mapToBox`'s scale factors against a zero-extent drag-
start union box (`vb.w/(ob.w||1)`). This round pins the behaviour and
closes the neighbouring audit surfaces.

## Pins (test.mjs)

`_mapToBox` invoked directly with `ob={x:50,y:0,w:0,h:60}` (two vertical
lines sharing an x — the exact zero-width case from 0888):

- pen `pts`: every output coordinate `Number.isFinite`; members collapse
  onto `vb.x` — no NaN/Infinity;
- line `x1/y1/x2/y2`: endpoints stay finite under the same degenerate box.

## Audit sweep (clean)

- `_grotDrag` — the sibling group gesture: all divisions guarded
  (`nb.w||1`) and fractions `_c01`-clamped; anchors re-normalized to the
  rotated bound shape's extent (0587 family).
- `_grpMapGet` — the cached halo map is built from live shapes only
  (`_sh()` with `_sv`/`_pgOk` filters): dead ids cannot appear; hidden
  members excluded (0592).
- Overlay lifecycle — `bindPreview` is `ptr.down`-gated and reset on
  every gesture end via `_zG`/`_zR`; quick-connect dots hide mid-drag;
  eraser-hover box is `_pgOk`-scoped (0831).
- Render caches — `_imgCache` count-bounded (60), `_penCache` px-bounded
  with per-entry `e.px` accounting (`_psc` purges on every removal path).

No defects found beyond those closed in 0887/0888/0889.

## Consequences

- index.html unchanged (V bump + comment only); test.mjs +2 pin blocks.
- Rule recorded: a gesture remap function must keep every emitted
  coordinate finite for degenerate inputs — pin the degenerate box
  directly, not through the 8-handle hit path.
