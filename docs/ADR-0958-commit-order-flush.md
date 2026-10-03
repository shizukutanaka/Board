# ADR-0958: `_recordCommitted` が pending nudge を必ず先に flush する

- Status: accepted
- Date: 2026-10-01
- Version: 1.7.984

## Context

ADR-0957 で導入した trailing-edge 共合器 `_nug` は、フラッシュ点として ① 400ms タイマ、② `_rcOp` (次の真 commit)、③ undo/redo、④ `switchPage` を張った。しかし `_rcOp` を**経由しない**直接 `Store._recordCommitted` 呼出サイトが残っていた:

- `ungroup` (op:'ungroup')
- `unlockAll` (op:'align', dir:'lock')
- `beautify` (op:'beautify')
- `_repC` 経路 (op:'replace' — import / clear-all / wholesale paste)

pending nudge セッションが存在する間にこれらが走ると、history/wire 上の commit 順が `[後発 op, nudge]` と実時間順 `[nudge, 後発 op]` に**反転**する。収束面では両 op が同一プロパティ集合を触るケースが稀なため実害は軽微だが、undo の逆順意味論 (最後に起きたことを先に巻き戻す) を破り、⌘Z が「先に解除した筈のナッジ」ではなく「後で起きた操作」を先に戻す順序異常を起こす。

## Decision

`_nugEnd()` を `Store._recordCommitted` の先頭ステートメントへ移し、「**pending nudge は常に後続 commit より先に history へ着地する**」を commit 経路全体の不変条件に昇格させる:

```js
_recordCommitted(op){
  _nugEnd();   // ADR-0958: pending nudge predates any later commit — flush first
  _iG();
  ...
}
```

- **再帰安全性**: `_nugEnd` は `_nug=null` を先行してから `_recordCommitted` を呼ぶため、内部での再 `_nugEnd()` は no-op。
- **`_rcOp` の明示 flush は維持**: `_rcOp` は flush 後に `_selIds()` で origSel を捕捉する必要があるため、先に `_nugEnd()` を呼ぶ現在形が正しい順序。
- **undo/redo/`switchPage` の明示 flush も維持**: これらは commit を伴わない経路 (pop + apply backward / view 遷移) で、`_recordCommitted` 内部の flush ではカバーされない。

## Consequences

- 今後新規に `_recordCommitted` を直接呼ぶ経路が増えても、時系列順序は自動的に守られる — 修正が「各 call site に flush を貼る」から「単一 chokepoint の不変条件」になる。
- nudge セッション中に import/clear-all が走るケースでも、history 順 = 実時間順が保たれ、undo 意味論が一貫する。
- コストは `_recordCommitted` 呼出毎に `_nug` の null チェック1回 (no-op パス)。

## Test pins

`nudgeSelection(3,0)` で pending セッションを作り、`_rcOp` を経由しない `Store._recordCommitted({op:'upd',...})` を直接呼び出し、history 末尾が `['move','upd']` の順であることをピン化。undo/redo/`switchPage` の flush は 0957 ピンが既にカバー。
