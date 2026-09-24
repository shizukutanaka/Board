# ADR-0221: drawio 固定アンカーの往復 (exitX/entryX ↔ aF/bF)

## 状態

実装済み (v1.7.279)。

## 背景

ADR-0209 で固定エッジアンカー (aF/bF、draw.io exitX/exitY
相当) を実装し、ADR-0220 で .drawio エクスポートを追加
したが、drawio 側の固定ポート値を双方向に写していな
かった — 往復で接続点位置が失われていた。

## 決定

- **import**: `exitX/exitY` → `s.aF`、`entryX/entryY` →
  `s.bF` (0..1 クランプ、bound 端のみ)
- **export**: `aF` → `exitX;exitY;exitDx=0;exitDy=0`、
  `bF` → `entryX;entryY;entryDx=0;entryDy=0`
  (drawio のペリメータ端点記法に準拠)

## 断念した代替案

- Dx/Dy オフセットまでマップ: Board の aF/bF は bbox
  分数のみなので Dx/Dy=0 に固定 — 非ゼロオフセットは
  インポート時に分数へ吸収される近似になる。

## 影響

- drawio↔Board で固定ポートの往復が保存される。
  浮動結合 (aF なし) は従来通りエッジ投影で近似。
