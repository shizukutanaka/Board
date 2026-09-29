# ADR-0261: drawio rotation= ↔ s.rotate 往復 (vertex)

## 状態
承認 — round38

## 背景
Board の回転は `s.rotate` (度、w/h 図形のみ有効)。drawio は vertex セルの
style `rotation=<deg>` で同じ意味を持つ。

## 決定
- export (vertex): `s.rotate` → `rotation=<整数度>`。
- import (vertex): `+sty.rotation` → `s.rotate` (±360 に clamp)。
  edge には drawio の rotation スタイルが形状回転を意味しないため据置き。

## 断念した代替案
- edge の rotation → s.rotate — drawio edge rotation はラベル向き用途で
  Board に対応なし。

## 影響
回転が drawio 往復で保持。1969 全緑。
