# ADR-0491: `_mid` — 中間ウェイポイント抽出の集約

## 状態

実装済 (v1.7.524)

## 背景

`pts.slice(1,-1)` (先頭/末尾を除く中間ポイント) が drawio 経路 3 箇所に複写:

- emit: pen stroke → polyline の中間 points emit
- emit: elbow conn の中間 waypoint emit
- import: polyline 中間点 → `s.way`

## 決定

`_mid(pts)=>pts.slice(1,-1)` に集約 — `slice` そのままなので単純 shorthand。

## 影響

- index.html −36B (523,195 → 523,159+def)
- 動作変更なし
