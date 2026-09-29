# ADR-0394: `_AL`/`_AP` 属性名定数化

## 状態
実装済 (v1.7.433)

## 背景
`'aria-label'` ×7 と `'aria-pressed'` ×6 の文字列リテラルが残りの余白を圧迫。

## 決定
`const _AL='aria-label',_AP='aria-pressed'` を `_ga`/`_sa` の定義行に併記し、全参照を
定数化 (HTML 属性リテラル `<div aria-label=...>` は対象外 — markup 側は変えない)。

## 影響
約 110B 回収。a11y 属性名の一元化で表記揺れも防げる。
