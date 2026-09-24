# ADR-0367: validPatch 数値フィールド拡張 + aF/bF 構造チェック

## 状態
承認 — round91

## 背景
`validPatch` は `x,y,w,h,…,dash` の数値型を強制するが、後発の
`labelPos/cbend/bend/spacing/lineH/fontSize` が未収録で、crafted op /
.board / share-link 経由で `cbend:"abc"` のような非数値を注入すると
描画計算が NaN 化しピアの描画が破損する (upstream-style 検証ギャップ)。

## 決定
- 数値一覧へ `labelPos/cbend/bend/spacing/lineH/fontSize` を追加。
- `aF`/`bF` は `{fx,fy}` オブジェクトのため別経路:
  `typeof p.aF==='object' && _fin(aF.fx) && _fin(aF.fy)`。

## 断念した代替案
`aF`/`bF` を数値扱い — 実際は object (ADR-0209) で誤リジェクトとなる。
z` など全フィールドを `_fin` スキャン — 文字列の正当 prop (type/label) を
排除するため field リストの明示を維持。

## 影響
2044 全緑。test.mjs に ADR-0367 ブロック追加。
