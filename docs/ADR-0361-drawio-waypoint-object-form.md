# ADR-0361: drawio import の waypoint を {x,y} オブジェクト形式に修正

## 状態
承認 — round86

## 背景
ADR-0090 で `s.way` の正規形は `{x,y}` オブジェクトの配列と定め
られたが、drawio import の代入 `s.way=pts.map(p=>[x,y])` は
タプル形式のまま書き込んでいた。`_wayArr` は正規化済み配列を
素通しするため、レンダラ (`p.x`/`p.y` 参照) は NaN になり
waypoint 折れ線が描画されなかった実バグ。

## 決定
`pts.map(p=>({x,y}))` に修正。影響範囲は drawio import のみ。

## 影響
waypoint 付き drawio edge が正しく折れ線描画される。2044 全緑。
