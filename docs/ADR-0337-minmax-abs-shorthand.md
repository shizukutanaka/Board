# ADR-0337: Math.min/max/abs の shorthand `_min`/`_max`/`_abs`

## 状態
承認 — round67

## 背景
`Math.min(`×127 / `Math.max(`×150 / `Math.abs()`×119 が raw サイズを
圧迫していた (~1.5KB)。

## 決定
`const _min=Math.min,_max=Math.max,_abs=Math.abs;` をグローバルに追加し
全呼び出しを書換。既存ローカル `_mi`(検索マッチ index)/`_mx` は
`_min`/`_max` と衝突しないためそのまま (名前空けのため `_mi` ではなく
`_min` を採用)。

## 影響
index.html 523,710 → 522,189B。test.mjs の html.includes リテラル
20箇所を機械更新 (node 側実行コードは未書換)。
