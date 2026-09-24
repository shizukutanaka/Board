# ADR-0119: 矢印ヘッドスタイル (arrow → dot → open)

## 状態

実装済み (v1.7.176)。

## 背景

コネクタのヘッドは塗り三角形のみ — draw.io / Excalidraw 相当の
ヘッドスタイル (丸・開いたシェブロン) が無く、UML・フロー表記の
表現力が限られていた。

## 決定

- `s.head` — `'arrow'` (既定・未設定) | `'dot'` | `'open'`。
  両端 (`s.start` ヘッド含む) に同一スタイルを適用。
- `_arrowHeadShape(...,style)` — canvas: dot=塗り円 (r=ah*0.35)、
  open=ストロークシェブロン。全4呼出サイトに s.head を伝播。
- `_svgArrowHead` — SVG export の twin ヘルパー。既存の inline
  polygon を7サイト → ヘルパー呼出に集約 (circle/polyline/polygon)。
- ctx `ctxArrowHead` — 矢印選択時のみ、`style` op で巡回
  (undo/同期は既存経路)。type 'line' に s.head が残っても
  描画されないため無害 — arrow 変換時に活きる。

## 断念した代替案

- **端ごとの別スタイル (s.headEnd/s.headStart)**: UI コスト対
  効果が薄い — 両端統一でカバー。
- **bar/diamond 等の更なるバリアント**: 3種で主要表記をカバー、
  追加分は HEAD_STYLES への追加で済む構造に留めた。

## 影響

- `.board`/共有ペイロードに s.head — 旧版クライアントは無視して
  三角表示 (後方互換)。
- SVG sites の polygon inline が8箇所→0 (helper 集約)。
