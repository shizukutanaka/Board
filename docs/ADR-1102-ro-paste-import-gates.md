# ADR-1102: read-only gates on the paste-import cascade

- Status: accepted
- Date: 2026-10-01
- Round: 852

## Context

`state.ro` (read-only share-link mode, ADR-1057) makes every mutation funnel
through `Store.commit`, which rejects at `:1475` before dedup/apply/broadcast.
ADR-1073 closed the first intake-side holes (`_placeCopies`,
`importBoardText`): callers whose commit was rejected still ran follow-on
side-effects — dead-id `dupIds` reseed and a phantom "pasted N" success toast.

This round audited the whole clipboard/drop ingest cascade (the ingest
counterpart to round851's export audit): `paste` listener →
`image/svg+xml` → `importSvgText`, `image/*` → `_imgImportFile`,
`text/plain` → `_textCascade` → (svg markup | .board JSON | excalidraw |
mxfile | TSV | plain text) → `doPaste` fallback.

## Findings

Three hole classes let intake seams run around the ro gate:

1. **Peer divergence (worst)** — `importDrawioText`'s multi-page branch
   broadcast `Net.broadcast({op:'addMany',shapes:p.sh,...})` *unconditionally*
   after its `pageAdd` `_cmt` had been rejected by the funnel. On a read-only
   board a multi-page drawio paste sent the imported shapes to every peer
   while adding nothing locally — the peers converge on shapes the viewer
   never sees.

2. **Feedback inconsistency** — `importSvgText`/`importExcText` fired
   `svgImported`/`excImported` success toasts after the rejected `addMany`
   (the same class ADR-1073 fixed for paste). `importDrawioText`'s single-page
   tail did the same with `dioImported`.

3. **Silent local mutation** — `replaceImage` calls `_imgImportFile` with a
   callback that writes `s.dataUrl`, `s.h`, and `delete s.img` on the *live*
   shape before committing a `style` op. The op was rejected on ro but the
   data-URL write already landed — a local-only mutation invisible to undo
   and divergent from every other view.

## Decision

One `if(state.ro){_roNo();return …}` entry gate per intake seam:

- `_imgImportFile` — covers paste images, drop images, and `replaceImage`.
- `_textCascade` — covers TSV/plain-text plus forwards to every importer
  below. Returns `true` (consumed) so the paste listener's `doPaste()`
  fallback doesn't reach `_placeCopies`'s own gate and double-toast.
- `importSvgText` / `importExcText` / `importDrawioText` — also reached
  directly (file pickers, `importDrawioFile`, the svg+xml clipboard branch).
  Return `true` for the same consume semantics.

Exempt by design: `importBoardText`/`importBoard`/`restoreBackup` already
adopt the payload's `ro` before `_repC` (ADR-1069/1073) — an editable import
is the intended unlock path. `_mergeImport` is gated transitively via
`_placeCopies` (ADR-1073).

## Consequences

- Read-only boards reject every ingest seam with exactly one
  `readOnlyMode` toast, zero shapes, zero wire traffic.
- The multi-page drawio broadcast leak is closed at the entry gate, not by
  gating the broadcast site — the gate also covers the per-page `pageAdd`
  commits that precede it.
- Gating at intake-seam entries (not inside the callback) keeps the fix at
  5 lines and covers seams that have no commit of their own.
