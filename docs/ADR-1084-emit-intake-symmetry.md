# ADR-1084 — local emit × remote intake symmetry, audit complete

- Status: audit complete, contract pinned (v1.8.108, round834)

## Context

Every local mutation rides the wire as a slimmed op (`Net.broadcast` →
`_slimOp` → BC + DC). The remote side drops any op failing
`validRemotePayload` — so a locally emitted op that fails the intake
contract would silently diverge the room. This audit checks the emit
grammar against the intake grammar op-kind by op-kind, then drives every
emit path for real and asserts the wire bytes pass the remote gate.

## Emit-side contract (verified symmetric)

- `_slimOp` is the single outbound translator: `clear` → `replace`
  (ADR-0626), `move` attaches absolute `after`/`before` coordinate patches
  (ADR-0729), `pageDel`/`pageName` carry only applied fields (ADR-0705),
  `style`/`resize`/`align`/`beautify` patches get `locked` stripped
  (except `align dir:'lock'`), and undo-domain fields (`origSel`,
  `moved`, `orig`, `wc`) never ride the wire (ADR-0625/0965).
- `computeConnClears` entries match the `_ccOk` schema
  (`{id,before?,after?}` over `_CC_KEYS` only).
- `validRemotePayload` requirements are all satisfiable from local
  producers: ids ≤64 via `uid()`, names/page names ≤80 via `_s80`,
  frac keys ≤600 via `reindexFrac` compaction, group/ungroup carry
  `before`/`gids`, `zorder` carries minimal `changes` (ADR-0742),
  `move`/`upd`/`style`/`align` patches are all `validPatch` domains
  (bounded numerics/strings per ADR-0868/0946/0947).

## Pinned (test.mjs, 4 asserts)

The block captures `Net.broadcast` for every local emit path — `add`,
`addMany`, `move`, `zorder`, `style`, `upd`, `align`, `group`,
`ungroup`, `del` (with `connClears`), `clear`, `replace`, `pageAdd`,
`pageName`, `pageDel`, `beautify`, plus undo-wire restores — passes each
through `_slimOp` **and a JSON round-trip** (what the wire actually
carries), then asserts:

1. every emit path produced a wire op;
2. every emitted kind is in `Store.REMOTE_OPS`;
3. every wire op passes `validRemotePayload`;
4. `clear` still translates to `replace(after:[])` on the wire.

## Consequence

Send/receive grammars are now pinned symmetric: a future emit path that
constructs an op the intake would reject fails the build instead of
silently diverging peers.
