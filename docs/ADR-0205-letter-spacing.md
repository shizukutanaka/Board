# ADR-0205: 字間 (letter-spacing)

## 状態

実装済み (v1.7.263)。

## 背景

draw.io の letterSpacing 相当が欠けていた — タイトルやラベルの
字送り調整ができない。Canvas2D は `ctx.letterSpacing` (Chromium 99+)
を持ち、依存ゼロで実装可能。

## 決定

`s.spacing` (px)。描画は drawShape 冒頭で
`c.letterSpacing=(s.spacing||0)+'px'` — シェイプ単位で1箇所に
設定し、そのシェイプ内の全テキスト部位 (text/sticky/boxラベル/
コネクタラベル/フレームラベル/画像キャプション) に一律適用、
末尾で `0px` にリセット。非対応ブラウザでは代入のみで no-op。
SVG は共有 `_svgLs(s)` で `letter-spacing` 属性を6箇所の
`<text>` に注入 (text-decoration ブロック直後、既存パターン)。

`cycleSpacing` (ctx「字間」、seq=null→1→2px) で巡回、
`Shape.make` で text/sticky 継承、`_styleOf`/eyedropper/
style-copy 往復、sticky chain extras にも追加
(計測と描画は measureText が letterSpacing を尊重する
対応ブラウザで一致)。

## 断念した代替案

- **px 直接入力**: UI 面積に見合わず巡回で十分 (1/2px が実用域)。
- **em 単位**: draw.io の letterSpacing は px — 揃える。

## 影響

- `s.spacing` 未設定は不変。大きな見出しテキストの字送りが可能に。
