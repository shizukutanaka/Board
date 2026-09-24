# ADR-0283: SVG import のグラデーション → 先頭 stop-color 近似

## 状態
承認 — round42

## 背景
SVG の `fill="url(#id)"` / `stroke="url(#id)"` はグラデーション/
パターン参照で、`_svgColor` が url() を一律除外していたため
フラットカラーが全く入らなかった (透明扱い)。

## 決定
svgToShapes で `<linearGradient|radialGradient>` の先頭 `<stop>` の
`stop-color` を Map に収集し、`_svgColor` が url() 参照をその色に
近似解決。未解決 (pattern 等) は従来通り null。

## 断念した代替案
- グラデーションを canvas gradient として再現 — fill モデルが単色の
  Board では描画パイプライン全体の拡張が要り見合わない。

## 影響
グラデーション SVG が輪郭+近似色で取り込める。1990 全緑。
