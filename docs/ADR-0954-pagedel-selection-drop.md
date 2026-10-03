# ADR-0954 — pageDel member kill drops selection ids ('del' parity)

## Status
Accepted — 2026-10-01 (round703)

## Context
Derived/reference-state hygiene audit (round703 axis): every path that removes a
shape from the scene must also drop its id from `state.selection`.

The three member-killing paths behave asymmetrically:

| path | tombstone | drops selection id |
|---|---|---|
| `'del'` forward | `_wM({_del:op.clock})` | `_sdl(sh.id)` per killed shape |
| `'clear'` / `'replace'` | `_wM({_del:...})` | `_scl()` wholesale |
| `_pgDel2` (pageDel / pageAdd-undo unpage) | `_wM({_del:op.clock})` | **nothing** |

`_pgDel2` filtered killed members out of `state.shapes` but left their ids in
`state.selection`, relying on `switchPage` to re-validate — which only runs when
`state.curPg===op.id && land!=null`.

## Defect
A remote `pageDel` that **empties the page set** (ADR-0703 path, `land=null`)
lands no `switchPage`, so a killed member's id stayed in `state.selection`
indefinitely — until the next explicit `_ss`/`_sdl` call. Consequences:

- status bar / SR announce over-counts ("N selected" includes a deleted shape);
- presence broadcast carries the dead id to peers (harmless but wrong);
- `_selIds()`/`origSel` records ghost ids into subsequent ops.

The same hole was latent in the local `pageAdd` backward (unpage) path whenever
a live selection could span the kill — the fix covers every `_pgDel2` caller.

## Decision
Drop killed ids at the kill site, inside the existing dead-loop in `_pgDel2`:

```js
for(const id of dead){_wc()[id]=_wM({_del:op.clock});_sdl(id)}
```

`_sdl` is a Set delete — idempotent, safe when the id was already dropped by
`switchPage`'s `_ss` revalidation on the `land!=null` path.

Boundary pinned: **only dead ids drop**. Members that survive the kill
(`s.locked` or `_bN`-newer born) are rehomed (`s.pg=firstId`, possibly `null`
when the set empties) and keep their selection — consistent with `'del'`, which
only `_sdl`s what it tombstones.

## Consequences
- `index.html`: +~10B (raw 557,016 ≤ 557,056).
- `test.mjs`: 4 behavioural pins — emptying remote pageDel drops the killed
  member's selection; a locked member survives un-paged and keeps its selection.
  Source pin at :5169 updated to the braced literal (the tombstone write is
  preserved verbatim inside the new braces).
- `_pgHealS` confirmed unrelated: it scrubs stale `s.pg` on surviving shapes,
  never touches `state.selection` — that stays `_ss`/`_sdl`'s job.
