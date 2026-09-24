# ADR-0451: `_mP`/`_sT` を引数取り形にして `new Map(a)`/`new Set(a)` fold

## 状態
実装済 (v1.7.486)

## 背景
`new Map(...)`/`new Set(...)` は zero-arg shorthand が既存 (`_mP`/`_sT`)
だが、引数サイト ~37 箇所が未 fold だった。

## 決定
`_mP=a=>new Map(a)` / `_sT=a=>new Set(a)` に再定義 — `new Map(undefined)`/
`new Set(undefined)` はコンストラクタ仕様上 empty 相当なので zero-arg
サイトもそのまま動作。引数サイトを `_mP(x)`/`_sT(x)` に fold (~150B)。

## 影響
- raw 523,854B (~434B headroom)。今回 def 先置きで self-fold 罠に
  再度当たった (def 内 `new Map(a)` が fold→再帰) — 規律: **fold は def
  挿入より先、あるいは def は fold 対象を literal で書く**。
