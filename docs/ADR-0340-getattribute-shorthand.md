# ADR-0340: `.getAttribute(` の shorthand `_ga(e,n)`

## 状態
承認 — round69

## 背景
`X.getAttribute(` が73箇所 (主に drawio/SVG import 経路) で
raw サイズを圧迫。

## 決定
`const _ga=(e,n)=>e.getAttribute(n);` を追加し、単純識別子受け手の
全呼出しを `_ga(e,` に機械書換。`setAttribute` は DOM 側が主で
回数が少ないため対象外。

## 影響
index.html ~522,176B (~600B 回収)。test.mjs リテラル 6箇所更新。
