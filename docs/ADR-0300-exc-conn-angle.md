# ADR-0300: excalidraw conn の angle を端点回転として輸入

## 状態
承認 — round48

## 背景
`angle` は `s.rotate` にのみ写され、`s.w!=null` の制約で
line/arrow には適用されなかった — excalidraw の回転済み矢印が
元の向きで取り込まれていた。

## 決定
conn に対しては `angle` を中点中心の回転として x1/y1/x2/y2 と
way[] 全点に適用 (端点回転は Board の conn モデルと等価)。

## 断念した代替案
- `s.rotate` を conn にも持たせレンダリングで回転 — conn は w/h を
  持たず rotate 適用箇所が多数になり見送り。

## 影響
excalidraw の回転済み line/arrow が正しい向きで輸入される。
