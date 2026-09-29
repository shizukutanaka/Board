# ADR-0032: ヒットテスト/マーキーのグリッド索引流用

## 状態
実装済み (v1.7.90)

## 背景
ADR-0016 で `draw()` の可視シェイプ抽出に `_buildGrid`/`_gridRectCandidates`/
`_queryGrid` を導入済みだが、pointer イベント駆動の2経路が未利用のままだった:

- **マーキー選択**: `pointermove` 毎に `state.shapes` 全件に `G.marqueeHit`
  (全包含判定) を実行 — 3000+ シェイプ盤面では 1 イベント ~0.07ms ながら
  ドラッグ中 60-240Hz で連続発生。
- **pickTop (>40 シェイプ経路)**: グリッドで近傍候補 `cands` は取るものの、
  その後 `state.shapes` 全件を2回 (非frame → frame) 走って `cands.has(s)`
  でフィルタ — 候補が少数でも O(全シェイプ)。

## 決定
- マーキー: `state.shapes.length>40` のとき `_gridRectCandidates(grid, r)` で
  絞り込んでから `marqueeHit`。**完全包含のシェイプはそのセルが必ず
  マーキー矩形のセルに内包される**ため、候補集合は全ヒットの上位集合 — 
  `marqueeHit` が最終判定を担い結果は全走査と一致する (margin cell 分だけ
  広めだが包含判定で漏れは生じない)。
- pickTop: 候補集合を `_grid.idx` (z順序) の降順にソートして直接反復 —
  全シェイプ2回のフィルタ走査を O(近傍セル) に圧縮。frame 二段判定は
  そのまま (非frame 優先 → frame)。

## 断念した代替案
- マーキーの結果を Store ops 化する検討 — 選択は ephemeral state であり
  op-log 化は undo 意味論を壊す (既存設計どおり)。
- `_GCELL` 調整 — 現行セルサイズで十分 (候補数は矩形近傍比例)。

## 影響
実測 (headless Chrome, 3061 シェイプ盤面): マーキー 200 ステップ
14.6ms → 2.0ms (**7.3×**)、pickTop 200 回 1ms。等価性: 5 矩形 ×
全包含比較・pickTop naive 上位一致 全て一致。
