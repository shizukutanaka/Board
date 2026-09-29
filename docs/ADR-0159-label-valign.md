# ADR-0159: ボックスラベルの縦揃え (`s.valign`)

## 状態

実装済み (v1.7.217)。

## 背景

ボックス (rect/ellipse/diamond) のラベルは常に垂直中央だった。
draw.io / Mermaid の組織図・フローチャートでは上揃えの見出し
的ラベルが一般的で、高いボックスで中央寄せは読みにくい。

## 決定

- `s.valign`: `'top'`|`'bottom'`、未設定 = 中央 (後方互換)。
  存在する `s.align` (水平) と独立。
- ctx「ラベル縦揃え」で 中央→上→下→中央 を巡回
  (`cycleVAlign`, 通常の style op)。
- canvas (`_drawBoxLabel`) と SVG (`_svgBoxLabel`) の両経路で
  同一座標系を適用 — top=内側 6px パディング、bottom=下辺 6px。
- `styleClipboard` に `valign` を追加 (look 系 prop として)。

## 断念した代替案

- **数値 (0/1/2)**: `s.align` と同じ文字列方式で JSON の可読性
  と .board/excalidraw 相互運用を優先。
- **frame にも適用**: frame ラベルは隅揃えの設計 — 混ぜない。

## 影響

- 描画+ctx+i18n。既存ボードは既定中央で不変。
