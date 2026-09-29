# ADR-0247: drawio `fontColor` ↔ text/sticky の `s.stroke`

## 状態
承認 — round36

## 背景
Board の text/sticky は `s.stroke` を文字色に使う (ADR-0192)。drawio 側の
対応は `fontColor` であり `strokeColor` ではない — 従来の export は
text にも strokeColor を付けており drawio 側で文字色が反映されなかった。

## 決定
- export: `t==='text'||t==='sticky'` の場合 s.stroke → `fontColor=`、
  それ以外は従来通り `strokeColor=`。
- import: `sty.fontColor` ('none' 以外) → `s.stroke`、text/sticky のみ。

## 断念した代替案
- conn ラベルへの適用 — drawio の edge ラベル色は labelBackgroundColor 系が
  別で必要になり範囲が膨らむため見送り。

## 影響
text/sticky の文字色が .drawio と往復する。1957 全緑。
