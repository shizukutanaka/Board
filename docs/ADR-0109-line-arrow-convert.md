# ADR-0109: 直線 ↔ 矢印の型変換 (ctx メニュー)

## 状態

実装済み (v1.7.167)。

## 背景

コネクタ種別は作成時に固定 — 直線で描いた後「やはり矢印」に
変えたい時は描き直しだった。draw.io / FigJam には型変換がある。

## 決定

- `toggleLineArrow()` — `s.type` を `line↔arrow` で style op
  `{before:{type},after:{type}}` としてパッチ。bindings/way/
  label/elbow/curve は全て形状上の属性なので型変更で保持される。
- ctx ラベルは最初の対象で動的切替 (line→`ctxToArrow` /
  arrow→`ctxToLine`、ctxLock と同じパターン)。
- `validPatch` は `type` を制限しないので共有同期も既存経路で
  通る (数値フィールドの型検査のみ)。

## 断念した代替案

- **ctx を2項目 (それぞれ表示)**: 動的1項目の方が簡潔
  (lockToggle 先例)。

## 影響

- mixed 選択 (line+arrow) では全て反転 — 混在時も一貫。
