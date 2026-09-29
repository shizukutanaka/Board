# ADR-0358: .drawio emit — elbow ルート角点を waypoint として出力

## 状態
承認 — round85

## 背景
elbow コネクタは `edgeStyle=orthogonalEdgeStyle` のみ emit し、
draw.io 側が独自ルーティングするため、s.bend の手動トランク位置
や実際の Manhattan 経路が draw.io 表示で失われていた。

## 決定
emit の Array points を `_wayArr(s)` (手動 waypoint) から、elbow
時は `_elbowPts(s).slice(1,-1)` (ルート角点) へ — draw.io は
waypoint を固定頂点として描くため同一経路が再現される。

## 断念した代替案
reimport で角点から s.bend を逆推定する案 — elbow 自動
ルーティングと競合し複雑。s.way として復元されるものの
elbow=1 時は自動経路が優先される (custom bend のみ差異、受理)。

## 影響
+~90B。draw.io 側で elbow の実経路が表示・頂点編集可能になる。
2044 全緑。
