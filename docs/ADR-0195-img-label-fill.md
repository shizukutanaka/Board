# ADR-0195: 画像キャプション帯に s.fill

## 状態

実装済み (v1.7.253)。

## 背景

画像キャプションの帯背景は `--paper` @0.85 固定 — ADR-0193 の
conn pill と同じ「fill 到達可能だが描画されない」隙間が
残っていた。

## 決定

帯背景を `s.fill||paper` に (canvas `_drawImgLabel` と SVG
`_svgImgLabel` の両方、透過 0.85 規約維持)。

## 断念した代替案

- **キャプション文字色も fill 化**: 文字色は既に s.stroke が
  担う — 帯背景のみ fill。

## 影響

- `s.fill` 未設定の画像は不変。fill 系の到達経路が全種で
  完全に整合 (text/conn pill/img band)。
