# ADR-0249: drawio edge ラベルスタイル (labelBackgroundColor / fontSize / fontStyle)

## 状態
承認 — round37

## 背景
drawio の edge ラベルは `labelBackgroundColor` (pill 背景)、`fontSize`、
`fontStyle` ビットマスクを持つ。Board 側ではコネクタラベルの pill が
`s.fill` (ADR-0193)、文字色が `s.stroke` (線色を継承)、装飾が
`s.bold`/`s.italic`/`s.under`/`s.fontSize` (ADR-0169/0170) なので対応する。

## 決定
- export: `s.fill` → `labelBackgroundColor`、ラベル付き edge の
  `fontStyle` ビットマスク (bold|italic|under) と `fontSize`。
- import: `labelBackgroundColor` → `s.fill`、`fontSize` → `s.fontSize`、
  `fontStyle` → `s.bold/italic/under`。
- edge の `fontColor` は **map しない** — Board はラベル文字色を線色
  (s.stroke) と共有するため、fontColor を s.stroke へ入れると線自体が
  変色する。近似できないので据置き (再輸出時に失われる)。

## 断念した代替案
- fontColor → ラベル専用 prop 新設 — レンダラ改造が要り本 ADR の範囲外。

## 影響
edge ラベルの pill 色・フォントサイズ・装飾が往復。1959 全緑。
