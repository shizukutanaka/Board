# ADR-0228: drawio ラベル装飾の往復 (align/fontStyle)

## 状態

実装済み (v1.7.285)。

## 背景

ADR-0199 の drawio インポートは `fontSize` までマップ
したが、`align`/`fontStyle` (太字・斜体・下線のビット
マスク: mxConstants FONT_BOLD=1/ITALIC=2/UNDERLINE=4)
は未対応 — drawio から取り込んだ図形のラベル装飾が
全て喪失していた。

## 決定

- **import**: `align=center|right` → `s.align`、
  `fontStyle` ビットマスク → `s.bold`/`s.italic`/`s.under`
- **export**: `s.align` → `align=`、同ビットマスクを
  `fontStyle=` に組み立てて往復を完結

## 断念した代替案

- `textDecoration` の複合値をそのまま通す: drawio の
  underline も bitmask の一部なので分離しない。

## 影響

- drawio 図形の中央揃え・太字/斜体/下線が Board に
  正しく乗り、export で往復する。
- `strike` は drawio の fontStyle に該当 bit がない
  (取扱外 — 往復対称ではないが輸入損失なし)。
