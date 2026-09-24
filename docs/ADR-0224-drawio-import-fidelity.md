# ADR-0224: drawio インポートの fidelity 拡張

## 状態

実装済み (v1.7.281)。

## 背景

drawio エッジの取り込みは orthogonal 判定のみで、以下が
失われていた: `endArrow=none` の線分が強制的に矢印化、
始点ヘッド (`startArrow`)、`curved`、`jumpStyle` —
いずれも Board に対応する実型/フラグがある。

## 決定

`drawioToShapes` の edge ループで追加マップ:

- `endArrow==='none'` → `s.type='line'` (ヘッドなし)
- `startArrow` 存在かつ `!=='none'` → `s.start=1`
- `curved==='1'` → `s.curve=1`
- `jumpStyle` 存在かつ `!=='none'` → `s.hop=1`

## 断念した代替案

- `fontStyle`/`align`/`verticalAlign` のボックスラベル
  マップ: Board のボックスラベルは中央固定で対応する
  プロパティが無い — 沈黙ドロップ (既存仕様通り)。

## 影響

- drawio↔Board のエッジ fidelity が完結: 種別・両端ヘッド・
  経路 (orthogonal/curved/waypoint)・ホップが往復保存。
