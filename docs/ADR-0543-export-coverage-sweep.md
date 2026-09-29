# ADR-0543: export 済み未テスト関数のカバレッジ一掃

- 状態: 実装済み (v1.7.571)
- 系: test

## 背景

テストハーネスへ export 済みだが behavioural テストで一度も呼ばれていない関数が
29 件残っていた (`unlockAll`/`selectSameType`/`toggleStickyText`/`toggleLineArrow`/
`cycleArrowHead`/`cycleStickyColor`/`snapSelToGrid`/`selectFrameContents`/
`doPasteInPlace`/`_imgNextKey`/`_mapToBox`/`_fitViewport` 等)。
ctx メニュー経由でしか到達しない経路は回帰検出が効かない。

## 決定

- test.mjs の behavioural 末尾に一括ブロックを追加し、上記12関数を網羅:
  - `_imgNextKey` の接尾辞インクリメント
  - `_mapToBox` の pts アフィン写像
  - `_fitViewport` の zoom clamp + センタリング
  - ctx 変換系の往復 (sticky↔text、line↔arrow、arrowhead 巡回、付箋色巡回)
  - `unlockAll` の単一 op 記録、`selectSameType`/`selectFrameContents` の選択遷移
  - `snapSelToGrid` のグリッド吸着、`doPasteInPlace` の原地貼付 + `origSel` 退避
- ついでに index.html のコメント尾 ~170B を刈り込み (raw 残量 ~218B に回復)。

## 影響

- 実行のみの変更。挙動不変。
- 判明した仕様の明文化: `_keepSel` は即時ではなく履歴エントリの `origSel` に退避
  (undo で元選択を復元) — テストがその契約を pin 化。
