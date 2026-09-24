# ADR-0244: excalidraw `verticalAlign` ↔ `s.valign`

## 状態
承認 — round36

## 背景
`_ct` が `verticalAlign:'middle'` 固定で `s.valign` を落としていた。
import 側もコンテナテキストの verticalAlign を親へ戻していなかった。

## 決定
- export: `_ct` の `verticalAlign` を `s.valign||'middle'` へ。
- import: 折り畳みループ (bLabel→親 label / 無印→sticky) で
  `e.verticalAlign` が top|middle|bottom に一致したら親の `p.valign` へ。

## 断念した代替案
- 非コンテナ text の verticalAlign — excalidraw の standalone text は
  verticalAlign を持たない (常に top 扱い) ため対象外。

## 影響
ラベル/付箋の縦揃えが往復する。1956 全緑。
