# ADR-0189: 行間 (line-height) 巡回

## 状態

実装済み (v1.7.247)。

## 背景

全テキスト系は型別の固定行間 (text/label 1.25, sticky 1.3) — 詰めた
表示やゆったり表示の調整手段が無かった。`s.lineH` 語彙で
「標準→狭い→広い」を巡回する。

## 決定

`cycleLineH` (ctx メニュー「行間」) で `null→1→1.5→null` を巡回 —
`fs*(s.lineH||<型既定>)` で全14サイトに適用:
- canvas: text (1.25), sticky (1.3), box/img ラベル (1.25)
- SVG export: 同3系統 + tspan 行間
- `resizeAfterTextEdit`: text/sticky の自動高さも追従
- `state.style.lineH` で last-used 継承 (text/sticky 生成時)
- `_styleOf`/スポイト吸収リストに追加 — スタイルコピーで一貫

## 断念した代替案

- **キーボードショートカット**: 使用頻度が低く ctx 列で十分。
- **既定値上書き**: null が型既定に戻る設計 — 絶対値にすると
  sticky の 1.3 が消えて既存盤面と食い違う。

## 影響

- s.lineH 未設定の図形は完全に不変。単一行ラベルにも適用されるが
  1行の見た目は変わらない (次行オフセットのみ変化)。
