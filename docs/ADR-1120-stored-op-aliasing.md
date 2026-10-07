# ADR-1120: stored-op × live-state aliasing audit — clean pass

- Status: accepted
- Round: 870 (docs + pins; no runtime change)

## Context

`Store.commit` records ops that carry structural payloads — `shapes`, `before`,
`after`, `pages`, `beforePages`, `wc`, `afterWc`, `origSel`. Those payloads live
inside `state.history` for up to `MAX_HISTORY` ops. Undo/redo, `_undoWire`, and
redo-wire re-send (or re-install) the stored values later. If any stored payload
shared a reference with a live object (or vice versa), a later write through one
handle would silently mutate the other: a remote `upd`'s in-place `_oa` patch on
a live shape could rewrite a history `before`, and the undo-wire would then
broadcast the polluted snapshot — divergence on one side only.

## Audit result: CLEAN on every face

1. **`clone` is a deep clone.** `function clone(o){return _JP(_JS(o))}` — nested
   arrays (`pts`, `way`, `frac`) and objects are fully detached.
2. **`state.wclock=` never adopts verbatim.** All 5 assignment sites write
   `state.wclock=_wM()` (replace forward, clear, .board import, share-link
   import, backup restore) or the rebuilt flood-trim map `t`. `state.wclock=op…`
   does not appear.
3. **`op.wc` restores merge per key.** `_wR` rebuilds each record into a fresh
   null-proto map `n` with `n[k]=clone(w[k])`; `_wAdopt` merges with
   `w[k]=clone(rc)` under `clockNewer`. `_wTb` carries `w._del`/`w._born`
   references into a fresh record — safe because clock objects are never
   mutated in place anywhere (zero `.ts=`/`.peer=`/`.seq=` writes).
4. **`op.wc` snapshots clone per record.** Both snapshot sites —
   `op.wc[sh.id]=clone(_wc()[sh.id])` (del/addMany) and
   `op.wc[id]=clone(_wc()[id])` (pageDel) — detach each record.
5. **`state.pages=` never adopts verbatim.** `_pgAdopt` sets
   `state.pages=keep&&_ln(keep)?clone(keep):null`; every other site writes a
   fresh literal or `null`.
6. **`state.shapes=` installs clones or fresh refs.** `_rs(arr)` installs
   `_uniq(arr)` verbatim, but every caller passes `clone(...)`-mapped arrays,
   `_attachShape(clone(s))` products, IDB-fresh records, or wire-parsed shapes.
7. **Backward installs clone.** Every restore loop pushes
   `Net._attachShape(clone(s))` (add/addMany/clear/replace/pageAdd/pageDel).
8. **`del` commits store clones.** All `shapes:` payload sites pass
   `clone(sel|live|mine|[s])`; the one non-`clone(` site stores `orig`, which
   is itself `clone(s)` taken at editor open (:5706).
9. **`_attachShape` returns fresh or safely-shared objects.** It destructures
   `{img:_x, ...rest}` when stripping refs, and call sites that pass possibly
   live/held shapes always wrap in `clone(s)` first; the remaining call sites
   pass wire-parsed or IDB-fresh objects.

## Decision

No code change. The contract is pinned in `test.mjs`:

- deep `clone` impl;
- no verbatim `state.wclock=op` / `state.pages=op` assignments;
- `_pgAdopt` deep-clones the keep list;
- per-key clock clones in `_wR`/`_wAdopt`;
- per-record clones in both `op.wc` snapshot sites;
- `shapes:clone(` at every del-commit payload;
- `_attachShape(clone(` at every install loop.
