# ADR-1076 — Read-only funnel completeness audit

Status: Accepted (round826, v1.8.100, docs+pin — no code changes)

## Context

`state.ro` (ADR-1057) marks a document as view-only: share links, `.board`
exports and `:prev` backups may carry `ro:1`, and the board gates every local
mutation funnel on it. Rounds 1069/1073 fixed the two adoption-order and
gate-coverage holes found later. This audit verifies the funnel is *total* —
that no local-mutation entry point misses the gate — and pins the contract.

## Funnel inventory (all gated)

| Entry point | Gate | Note |
|---|---|---|
| `Store.commit(op)` | `_nugEnd()` → `if(state.ro){_roNo();return}` | the nudge flush runs first so a pending key-nudge isn't stranded when ro flips mid-session |
| `Store._recordCommitted` | same | the `_repC` path funnels here |
| `Store.undo()` / `Store.redo()` | `{_roNo();return false}` | after the live-gesture cancel + nudge flush |
| `_repC` (replace swap) | `{_roNo();return}` at `:805` | wholesale swap records through `_recordCommitted` |
| `_placeCopies` | `{_roNo();return[]}` | precedes the dup-chain reseed; 0-count toasts suppressed |
| `importBoardText` (clipboard `.board`) | `{_roNo();return true}` | consumed-but-rejected so the cascade doesn't fall through |
| `beginText` / `openTextEditor` / label editor | gated | editors never arm |
| draw-tool arming (`pointerdown`/tool pick) | `_tl()!=='select'` / `tool!=='select'&&tool!=='hand'` | pan + select survive |
| docName input | gated + reverts the field | |
| `doDelete`/style ops/ctx actions | funnel through `commit` | |

## Adoption-order contract (pinned)

`importBoard` (`.board` file) and `Share.importFromHash` (share link) adopt the
payload's flag **before** `_repC` records the swap:

```
_rs(...); _pgAdopt(...); ... state.ro = d.ro===1; _roBadge(); _repC(...)
```

Consequences:

- ro doc + **editable** payload → `ro` flips to 0 → `_repC` propagates — the
  designed *unlock* path (opening an editable export re-enables editing).
- ro doc + **ro** payload → stays ro → `_repC` drops the wire op; the local
  swap is a view mutation only, which is consistent because an ro doc never
  propagates anyway.
- Merge (`importMerge` → `_mergeImport` → `_placeCopies`) keeps the *current*
  doc's ro flag — merging into a ro doc is gated at `_placeCopies` and adds
  nothing.

## Rejected direction

Gating the whole import UI on `state.ro` (refuse to open an editable file on a
ro doc) was considered and rejected: it would break the intended unlock path
above. The payload's own `ro` flag decides.

## Test coverage

`test.mjs` gains 4 behavioural pins (ro `commit` records nothing / mutates
nothing; `undo`/`redo` refuse) and 5 source pins (commit gate after
`_nugEnd`, undo/redo gate, both adopt-before-`_repC` sites, `importBoardText`
gate). The per-site gate pins from ADR-1057's round already cover the
remaining funnels.
