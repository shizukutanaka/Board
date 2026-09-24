# ADR-0276: excalidraw scale 反転を全要素へ一般化

## 状態
承認 — round40

## 背景
excalidraw の `e.scale:[-1|1,-1|1]` は全要素共通の反転表現だが、import
は image 分岐でのみ読み、export も image にしか書いていなかった。
rect/ellipse/diamond/text 等の反転が往復で失われていた。

## 決定
- import: 共通 tail で `e.scale` の負値 → `s.flip` ビットマスク
  (全型)。image 分岐の重複処理は削除。
- export: `E()` ベースに `scale:[s.flip&1?-1:1,s.flip&2?-1:1]` を
  常設 (image 専用の override は削除)。

## 断念した代替案
- conn (line/arrow) への flip 適用 — excalidraw でも線の反転は
  scale ではなく points 座標で表すのが自然で、import 側は points
  そのまま読むため往復は既に正しい。

## 影響
全要素の反転が excalidraw 往復で保持。1983 全緑。
