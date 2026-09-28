# ADR-0545: ペン内部プリミティブ + _svgBoxLabel のカバレッジ

- 状態: 実装済み (v1.7.573)
- 系: test

## 背景

ADR-0543/0544 の sweep 後も残っていた未テスト12件のうち、ペン描画コア
(`_penTaperI`/`_penTaperE`/`_penQuad`/`_penDisc`/`_penFillRange`) と
SVG ラベル emit (`_svgBoxLabel`) は DOM 非依存でレコーディング ctx で検証可能。
残り (`positionTextEditor`/`_syncStylePanel`/`_stickyChain`/`_drawImgLabel`/
`exportViewportPNG`) は DOM/画像依存で behavioural harness では非現実的。

## 決定

- レコーディング ctx (moveTo/lineTo/arc/fill の呼出し記録) で検証:
  - テーパー関数の飽和点 (`_penTaperI/E`(PEN_TAPER)=1、0 地点は <1)
  - `_penQuad` が台形 (moveTo×1 + lineTo×3) を発行
  - `_penDisc` が指定半径で arc、`_penFillRange` が fill 1回
- `_svgBoxLabel`: label の XML エスケープ + align → text-anchor マップ。

## 影響

- 実行のみ。export 未テストは DOM 依存の5件に縮小 (harness 対象外)。
- ペン描画の最内ループ (ADR-0046 union-of-primitives) が初めてテスト下に入る。
