# ADR-0944: Derived/reference-state lifecycle audit — complete

## Status
Accepted (2026-10-01) — audit complete; no defect found. Documents the verified
invariants so future edits keep them.

## Context

Following the gesture-dispatch fixes (ADR-0942) and the multi-pointer abort pin
(ADR-0943), this round audited the lifecycle of **derived/reference state** —
in-memory references that must be revalidated or reset when the shape universe
changes — plus two degenerate-input domains (type coverage and zero-length
geometry). Every axis came back clean; this ADR records the verified contracts.

## Verified invariants

### 1. Type-coverage matrix is closed

`_TYPES` (line 1349) holds the 10-shape universe
`{rect,ellipse,diamond,pen,line,arrow,text,sticky,image,frame}` and `validShape`
rejects anything outside it at every intake (wire, file, paste, IDB). Every
`switch(s.type)` consumer covers the full set or carries an explicit default:

- hit-test (1241), drawShape (3030), excalidraw emit (6770 + `default`),
  SVG emit (7692), minimap raster (10216).

The closed-universe intake gate (ADR-0387) is what makes exhaustive switches
possible at all — a forged type can never reach a consumer.

### 2. `state.hover` / `_laser` revalidation

`state.hover` stores a shape **id**, not an object reference. Every consumer
resolves it through `byId` at use time (quick-connect gate at 3422-3423:
`if(_tl()!=='select'||(!g&&ptr.down)||!state.hover)return null; const
s=byId(state.hover)`). A remote `del` therefore leaves no ghost: the id stops
resolving and the consumers no-op. Both `hover` and `_laser` are cleared on
`pointerleave` (ADR-0526) and on every gesture/mode exit path.

### 3. `state.selection` reconciles on every removal path

- remote `del` → `_sdl(id)` at 1635 (single) and 1644 (bulk);
- wholesale `replace`/`clear` → `_scl()` + `_pcC()` at 1706/1716;
- remote hide via prop patch → `_sdl(id)` when `_hd(_s)` at 1853;
- `_pgAdopt` (page-set change) re-filters the selection.

The local del path shares the same `_apply` forward branch, so the local pin
(flushErase → `selection.size===0`, test.mjs ~11445) covers the remote path too.

### 4. Gesture-state resets cover every cancel path

`_zR()` clears draft/marquee/guides/readout/bindPreview/measure/lasso;
`_ptrReset()` clears all `ptr.*`; `abortGesture()` geo-restores via `_geoR`
whitelist, restores `_eraseBatch`, drops `_penPred`, then calls both. Triggered
by: second-pointer PD (pinned by ADR-0943), presentation entry, page switch,
blur/hidden/pagehide, ⌘Z mid-gesture — and tool-switch dispatch sites are now
`!ptr.down`-gated (ADR-0942) so a stale tool can't redirect move/up handling.

### 5. `_frameOf` is deterministic and cycle-free

Frame membership is containment-based: a shape's own bbox is excluded, nested
frames pick the outermost container via the `fs.some` skip rule, and since
membership derives purely from geometry there is no reference graph to cycle.

### 6. `frame()` RAF-loop flag discipline (ADR-0565)

`needsRender`/`needOverlay` are cleared unconditionally after try/catch-wrapped
`draw()`/`drawOverlay()` — a draw throw can't strand the flag (repaint spam) or
kill the loop; post-draw hooks (`sendSelectionIfChanged`, `_mirrorSync`,
`_teFollow`, `_lblFollow`, `_syncStylePanelIfChanged`, `_statusSel`) get their
own try/catch. An `_iv()` call during draw re-arms `_rafId` via the tail check.

### 7. Degenerate geometry is guarded

- `distToSeg`: `ll<1e-9` → distance to the shared endpoint (zero-length segment);
- `_polylineRd`: `e1`/`e2` fall back to `||1`, `rr<=0` degrades to a straight
  `L` segment — zero-length/duplicated-waypoint polylines emit no NaN in SVG;
- a zero-length line/arrow (`x1===x2,y1===y2`) is drawable, hittable and
  exportable without NaN.

### 8. `_oa` targets always resolve

`_oa = Object.assign` throws on a null target. Every call site either guards
`sh&&`/`if(sh&&!sh.locked)` (connClears apply at 1660, beauty/align paths at
2163/5660/6528) or iterates `p.id` values minted from live `_sh()` in
`_remoteDelConnFix` — whose `goneIds`/`handled` exclusions guarantee the fixed
connector is never one of the ids the same op deletes.

### 9. id-collection ops skip missing shapes

`move`/`zorder`/`align`/`group`/`ungroup` and the `connClears` apply loop all
`continue`/`if(sh)` on a `byId` miss — a forged or raced id can neither throw
nor produce a partial apply.

## Decision — no change

All nine invariants hold in the current code; nothing to fix. The audit's
deliverable is this contract: **any new derived/reference state must either
resolve through `byId` at use time or be reset on the `_zR`/`_ptrReset`/cancel
surface**; any new `switch(s.type)` consumer must cover `_TYPES` or carry a
default; any new op carrying id lists must `byId`-guard per element.

## Consequences

- Documentation only; `pass` unchanged (3013 asserts remain green).
- The invariant list becomes the checklist for future gesture/derived-state
  work in this subsystem.
