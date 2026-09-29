# ADR-0331: drawio `fillStyle` ハッチ往復

## 状態
承認 — round61

## 背景
draw.io の sketch 塗りは `fillStyle=hachure|cross-hatch|zigzag`。
Board のハッチ (`s.fstyle`) は excalidraw では往復済み (ADR-0231/
0268) だったが drawio では未マッピングで失われていた。

## 決定
import: `_dioStyApply` で `hachure|zigzag→hatch`、
`cross-hatch→cross`。emit: `_dioStyEmit` に `fillStyle=` を追加
(edge では不適用 — ラベル pill の fill と混同しないよう `!edge`
ゲート)。

## 影響
drawio sketch 図形がハッチ維持で往復する。2039 全緑。
