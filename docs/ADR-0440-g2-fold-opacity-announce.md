# ADR-0440: `_g2` フォールド + 完全透明シェイプの SR announce

## 状態
実装済 (v1.7.475)

## 背景
- `x.getContext('2d')` が 10 サイト — 繰り返し呼出しを `_g2(c)` に集約。
- describeShape / DOM mirror の「非表示」タグは `s.visible===0` (hide op)
  のみを見ていたが、`s.opacity===0` も視覚的に完全に不可視 — スクリーン
  リーダーは「描画されている」と誤認していた。

## 決定
- mega-const 行に `_g2=c=>c.getContext('2d')` 追加、10 サイト fold
  (~55B 回収)。
- `_hd(s)||_oP(s)===0` を 2 つの announce サイトに適用 — 完全透明も
  `(非表示)` と読み上げる。pick/snap 系の `_hd` 意味論は変更しない
  (透明シェイプは依然選択・スナップ対象)。

## 影響
- ~25B ネット回収 + SR の視覚パリティ改善。
