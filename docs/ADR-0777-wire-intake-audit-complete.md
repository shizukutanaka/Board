# ADR-0777 — wire intake 検証監査の完走記録

Status: accepted (round526)

## Context

round525 で `validRemotePayload` の全16 wire op を精査し、実害1件
(`pageDel`+`unpage` の kill 集合欠落、ADR-0776) を修正した。本 ADR は
同監査の残確認項目と結論を記録する。

## 確認済み不変条件

- **呼出し順**: `applyRemote` は `REMOTE_OPS` 許可リスト → `validClock(op.clock)`
  → `validRemotePayload(op)` → `_apply`。拒否は半適用なしに棄却。
- **wire `wc` ライフサイクル**: `_slimOp` が `del`/`clear`/`pageAdd` の
  `wc` を剥がし、受信側 forward が先に `op.wc={}` を再導出 — undo 専用
  フィールドは wire に乗らない。`addMany.wc` / `replace.afterWc` は
  `wcOk` で検証済 (0726)。`add.wc` は `_mergeSnapshotOp` 内で
  エントリ毎 `validClock`+`validPatch` 自己ガード。
- **`_undoWire` 出力は `_slimOp` 経由**: `pageDel` の `unpage:0` は
  wire で除去 (falsy → `s.unpage` 未設定) — ADR-0776 の新検証で
  ローカル undo が peer 棄却される回帰なし。
- **`_slimOp` の undo-domain 剥離**: `origSel`/`moved`/`wc` は
  `rest` fall-through で除去、特殊形は最小 wire 形を再構築。
- **outbound ↔ intake 整合**: `upd.after` の `locked` を唯一の lock 経路
  `align dir:'lock'` が担い、`upd` 系 noLock と一致。`visible`/`pg`/`frac`
  等の送出 prop は全て validPatch の型許可内。

## 検出したが見送った候補

- `del`/`clear` の `wc` 検査: wire が運ばず forward が overwrite する
  ため追加しても常に真 — dead weight のため入れない。
- `unpage`+`shapes:[]` (kill 集合ゼロ): 空ページの conforming op。
  `die=∅` でメンバー un-page — 受信側に余剰メンバーが居る場合のみ
  挙動差が出るが、収束下では起こらない (0724)。

## Consequences

- wire intake 層の監査は完走。`docs/architecture.md` の受信側検証節に
  ADR-0776 の kill 集合規則を同期した。
- test.mjs に ADR-0776 の behavioural ピン4件 (non-conforming drop ×2、
  conforming kill-set で指定 id 消去 + 集合外メンバーは un-paged 生存)。
