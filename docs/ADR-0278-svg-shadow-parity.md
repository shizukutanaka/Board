# ADR-0278: SVG export の drop-shadow parity 修正

## 状態
承認 — round40(41)

## 背景
canvas は rect/ellipse/diamond/line/arrow/pen/image/text に `s.shadow`
を描き、sticky は常時アンビエントシャドウを持つ。SVG export は
diamond/image/text/conn のみ `${_sh}` を出し、rect/ellipse/pen が
欠落、sticky の常時影も未反映だった。

## 決定
- rect/ellipse/pen(g要素+単点circle) に `${_sh}` 追加。
- sticky には `filter="url(#bsh)"` を常時付与し、defs 条件を
  `s.shadow || s.type==='sticky'` に拡張 (sticky が1つでもあれば
  bsh を発行)。

## 断念した代替案
- sticky 専用の弱い filter を別途定義 — 色味差 (0.08 vs 0.22) は
  気にならないレベルで共通化を優先。

## 影響
SVG export が canvas の影表示と一致。1985 全緑。
