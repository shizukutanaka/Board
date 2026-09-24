# ADR-0101: 付箋色クイックサイクル (ctx メニュー)

## 状態

実装済み (v1.7.159)。

## 背景

付箋色変更は fill swatch 経由 (ADR-0082 で color リマップ) だが、
6色パレットを順送りする1クリック操作がない — 色分け運用で
カラーピッカー往復は億劫。

## 決定

- `cycleStickyColor()` — ctx メニュー `ctxStickyColor` で
  `STICKY_COLORS` 内を循環 (`(i+1)%6`、未知色は indexOf=-1→
  先頭色へ)。style op で undo/複数選択可。

## 断念した代替案

- **カラーピッカー統合のみ**: swatch 群との往復が毎回必要 —
  cycleTextAlign と同じ巡回パターンで十分。

## 影響

- パレット外の色 (fill swatch のカスタム色など) からも先頭色へ
  復帰できる。
