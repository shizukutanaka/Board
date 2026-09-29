# ADR-0264: drawio edge mxGeometry@x ↔ s.labelPos 往復

## 状態
承認 — round39

## 背景
drawio の edge ラベル位置は `<mxGeometry relative="1" x="…">` の `x`
属性に −1..1 の相対座標で格納される。Board は `s.labelPos` (ADR-0117)
に 0..1 の弧長位置を持ち、線形写像で往復できる。

## 決定
- import (edge): `g.getAttribute('x')` → `labelPos=(x+1)/2` (0..1 clamp)。
- export (edge): `s.labelPos!=null` → `mxGeometry` に
  `x="${labelPos*2-1}"` 属性を付与 (未指定時は従来通り属性なし=中央)。

## 断念した代替案
- `mxPoint as="offset"` のピクセルオフセット — Board の語彙は弧長位置
  のみで、オフセット往復は近似精度が落ちる。

## 影響
コネクタラベル位置が drawio 往復で保持。1971 全緑。
