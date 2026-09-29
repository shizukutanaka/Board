# ADR-0073: テキスト揃え (left / center / right)

## 状態

採用 (v1.7.131)

## 背景

テキスト図形・付箋の本文は常に左揃え、ボックスラベルは常に中央揃えで、
揃え位置の変更手段が無い (Excalidraw/draw.io は選択テキストの揃え切替を
サポート)。

## 決定

- `s.align` ∈ `left|center|right` を `text`/`sticky` 図形に追加 (未設定=left)。
- `drawText`/`drawShape`(sticky) は揃えに応じて `c.textAlign` とアンカー
  x を切替 (left: x+pad, center: 中央, right: 右端−pad)。
- SVG export は `text-anchor` (start/middle/end) で表示=出力パリティ維持。
- インライン editor (textarea) にも `text-align` を同期。
- ctx メニュー `ctxTextAlign` は `cycleTextAlign` で左→中央→右を巡回、
  `style` op で commit (undo/LWW 同期は既存経路)。
- ボックスラベル (rect/ellipse 中央揃え) とコネクタラベルは対象外 — 幾何
  ラベルは位置が意味を持つため。

## 断念した代替案

- **行単位/ブロック単位の揃え (rich text)**: 単一 `s.align` で実用上十分。
- **キーボードショートカット (⌘⇧L/C/R)**: ctx メニューで発見可能な方を
  優先。要望あれば後付け。
- **justify (両端揃え)**: canvas 標準では行分割後の余白計算が要り、
  scratchpad 用途に対し重すぎる。

## 影響

- `drawText`・sticky・SVG・editor・ctx メニューの各描画/入力経路に
  align 分岐追加のみ — op・モデル不変 (既存 `style` op を流用)。
- 未設定の既存図形は left で見た目同一。
