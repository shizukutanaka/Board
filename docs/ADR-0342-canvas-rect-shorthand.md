# ADR-0342: `canvas.getBoundingClientRect()` の shorthand `_cbr()`

## 状態
承認 — round71

## 背景
`canvas.getBoundingClientRect()` (26B) が21箇所に散在 — 全て同一
レシーバ (`canvas`) のため `_cbr()` (6B) に畳み込める。

## 決定
`const _cbr=()=>canvas.getBoundingClientRect();` を追加し全呼出しを
書換。`currentTarget`/`mc` の2件は頻度が低く対象外。

## 影響
index.html ~522,341 → 521,898B (~440B 回収)。test.mjs リテラル
3箇所更新。
