# ADR-0079: 幅 / 高さ揃え (match size)

## 状態

実装済み (v1.7.137)。

## 背景

整列 (left/cx/…) と等間隔配置 (hspace/vspace) はあるが、サイズ揃えがない。
draw.io の Arrange → Match Size に相当し、フローチャートのボックス群を
同一寸法にする日常的な操作。複数選択リサイズ (ADR-0056) は手動調整で、
「基準と同じ寸法にする」には出来ない。

## 決定

- `doMatchSize(dim)` — `dim` ∈ `'w'|'h'|'wh'`。
  選択内の box 型 (`rect/ellipse/diamond/sticky/image/frame`) のみ対象、
  基準は**最初に選択されたシェイプ** (Set は挿入順なので先頭)。
  位置は不変、寸法のみ代入 (draw.io と同じ top-left アンカー相当)。
- `align` op として記録 (`dir: 'matchw'|'matchh'|'matchwh'`) —
  before/after スナップショット方式は doAlign と同型、undo/LWW/RTC 無料。
- ctx メニューの整列ブロック末尾に3項目 (幅/高さ/幅と高さ)。
- text は対象外 (w は編集ごとに再計測されるため match の意味がない)、
  pen/connector も対象外 (点列のスケーリングは曖昧)。

## 断念した代替案

- **基準 = 最大/最小のシェイプ**: draw.io は「最初の要素」が基準。
  選択順を使う方が利用者の意図に忠実。
- **ctx 2項目 (幅/高さ のみ)**: 'wh' 一発が頻用なので3項目にした。
- **pen/connector も伸縮**: 寸法マッチの対象として意味が薄く、
  pts スケールはリサイズハンドルで既に可能。

## 影響

- `align` op の `DIRS` バリデータに `matchw/matchh/matchwh` を追加。
- `before`/`after` はフルクローンパッチ (doAlign と同じ) — undo は一括復元。
- i18n `ctxMatchW/ctxMatchH/ctxMatchWH` ja+en。
