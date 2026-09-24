# ADR-0097: .excalidraw 多点 line/arrow → 真のコネクタ + way 配列

## 状態

実装済み (v1.7.155)。

## 背景

`excToShapes` は 3点以上の line/arrow を `pen` にフォールバック
させていた — 矢印として編集できない死骸化。Excalidraw の
elbowed コネクタは複数 points でシリアライズされるため、
実用シーンで頻出する形。

## 決定

- `freedraw` のみ `pen` のまま; `line`/`arrow` は常に対応型で生成:
  `x1/y1=pts[0]`、`x2/y2=pts[last]`、中間点を `s.way` (ADR-0090 の
  配列形式) へ格納。ルート編集・ラベル・SVG・minimap がそのまま効く。

## 断念した代替案

- **pen 変換維持**: インポート後にコネクタとして機能しない
  (矢印ヘッド消失、バインド不可) — ADR-0090 で障害が消えた。

## 影響

- elbowed 矢印がエルボー相当の見た目で正確に復元 (way 中間点)。
- 2点の line/arrow は従来通り way なし。
