# ADR-0523: `_tC` textContent setter shorthand

## 状態

実装済み

## 背景

`X.textContent=v` の直接代入が 21 サイトに分散。1.7.555 で加えた
contextmenu ガード (ADR-0524) と直近のイベント系修正の追加分を相殺するため
setter fold する。

## 決定

```js
const _tC=(e,v)=>e.textContent=v;
```

`X.textContent=<expr>;` → `_tC(X,<expr>)` (値は単純 token に限らず
`[^;\n]+` の任意式 — ブロック末尾 `}` は fold 後に外側へ復元)。
`===` 読み取り・ネストした `.textContent` は対象外。

## 影響

- 21 サイト fold、net ~−260B → 524,068B (残 ~220B)
- ピン同期: `data-t i18n auto-apply` を post-fold リテラルへ
- test.mjs 2080 全緑
