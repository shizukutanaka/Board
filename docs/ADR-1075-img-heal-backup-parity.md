# ADR-1075: Image-heal page coverage & backup-slot payload parity audit

- **Status**: Accepted (round825, v1.8.099)
- **Context**: Two seams that sit just off the paths already covered by
  ADR-1046/1049 (img pending lifecycle) and ADR-0004/1056/1069 (`:prev` backup):

  1. **Page coverage of the img heal machinery** — `_imgRescan`, `_pcR`,
     `Net._imgqSweep` and the blob-arrival heal all walk `_sh()` (the whole
     shape array), not the page-scoped `_shV()` subset. A shape carrying a
     parked `img:` ref on a non-viewed page still re-parks, still re-asks via
     imgq, and still resolves when the blob arrives — there is no page-scoping
     gap.
  2. **`:prev` backup payload** — the pre-destructive safety record carries
     `shapes` + `viewport` + `docName` + `pages` + `curPg` + `rs` (room secret)
     + `ro`, so restoring a backup of a multi-page or read-only doc preserves
     its layout and mode. The blob GC in `Persist.save` unions the `:prev`
     record's `img` refs into the live set, so backup-referenced blobs survive.
  3. **Local `addMany` apply parity** — paste/merge/dup/undo addMany all route
     through `Net._attachShape`, so ref-only images park for imgq heal and the
     `{img,dataUrl}` coexistence strip (ADR-1066) applies uniformly.

## Decision

No code change — audit complete, contract pinned.

**Deliberate non-fix**: the `:prev` record does NOT carry the causal markers
(`wc`, `rep`, `nts`, `ntp`) that the live `main` record persists
(ADR-0460/0695). A restore is a fresh causal act: `restoreBackup` emits a
`replace` op stamped with a new clock, and every restored shape gets a fresh
`_born` stamp via the replace's apply path (ADR-0927). Carrying the old markers
would make a restored doc lose LWW arbitration against its own peers' live
clocks — the fresh-clock semantics are the correct ones. The `:prev` slot is a
last-resort safety net, not a sync source.

## Pins (test.mjs)

- `_imgRescan` parks a ref carrying `pg` on a non-viewed page alongside the
  viewed page's (proves the `_sh()` scan, not `_shV()`).
- Blob-arrival heal iterates `_sh()` (`for(const s of _sh())if(s.img===msg.key)`).
- The `:prev` put record carries `pages:_pgs(),curPg:state.curPg,rs,ro`.

## Consequences

- Backups of paged or read-only docs restore their full context.
- Off-page parked image refs heal without needing a visit to their page.
- The absent causal markers are now a documented invariant, not an accident —
  anyone tempted to "complete" the backup record should preserve the
  fresh-clock restore semantics.
