# ADR-0245: drawio `visible="0"` ↔ `s.visible===0`

## 状態
承認 — round36

## 背景
mxCell には `visible="0"` 属性がある。Board の export は不可視図形を
**完全に除外**していたため、往復させると図形ごと消えた。

## 決定
- export: vertex/edge の `visible===0` スキップを外し、代わりにセル属性
  `visible="0"` を付けて送る (drawio 側でも非表示として正しく保持される)。
- import: `c.getAttribute('visible')==='0'` → `s.visible=0`、vertex/edge 双方。

## 断念した代替案
- 従来通り除外 — 「非表示は自宅に置く」ポリシーは安全だが情報が失われる。
  visible=0 は drawio の正規の不可視表現であり、往復忠実度が上。

## 影響
非表示図形が .drawio を往復しても非表示のまま残る。1957 全緑。
