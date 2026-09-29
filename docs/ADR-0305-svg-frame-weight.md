# ADR-0305: SVG export のフレームラベルを常時 600 weight に

## 状態
承認 — round49

## 背景
canvas の frame ラベルは `600 ${fs}px` で常時太字だが、SVG export は
`_svgFont` 経由で `s.bold` 有り時のみ `font-weight="600"` を emit
していたため、輸出 SVG だけラベルが細くなる非対称だった。

## 決定
`_svgFont(s.bold?s:{...s,bold:true},s.fontSize||12)` — frame ラベルは
bold 強制として emit (canvas と一致)。

## 断念した代替案
- canvas 側を 400 に揃える — frame ラベルの視認性設計 (常時600) を
  変える方が悪い。

## 影響
SVG export の frame ラベルが canvas/PNG と一致。2012 全緑。
