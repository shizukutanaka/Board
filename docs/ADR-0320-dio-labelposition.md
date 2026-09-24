# ADR-0320: drawio labelPosition/verticalLabelPosition の往復

## 状態
承認 — round54

## 背景
drawio の `labelPosition` (left/center/right) と
`verticalLabelPosition` (top/middle/bottom) は図形内の
ラベルスロット位置で、`align`/`verticalAlign` (スロット内の
テキスト揃え) とは別語彙。輸入は未対応、書出もスロットを
出していなかった。

## 決定
- 輸入: `_dioStyApply` で有効値を `s.align`/`s.valign` にマップ
- 書出: vertex emit に `labelPosition=`/`verticalLabelPosition=` を追加
  (既存の `align=`/`verticalAlign=` emit は維持 — 語彙が別)

## 断念した代替案
- `align=` に一本化 — drawio 側で labelPosition=bottom+align=center
  のような有効な組合せを表現できなくなる。

## 影響
ラベルスロットが往復。2028 全緑。
