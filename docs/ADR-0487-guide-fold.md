# ADR-0487: `_gV`/`_gH` — スナップガイド push の 4 サイト fold

## 状態

実装済 (v1.7.520)

## 背景

edge snap / equal-gap snap のガイド線生成が、可動形状とターゲット形状の
union レンジを min/max で束ねる 4 点 push として 4 箇所に同一形で複写:

- `resizeSnap` の movesX (縦ガイド) / movesY (横ガイド)
- `_snapBoxIdx` の bx (縦ガイド) / by (横ガイド)

いずれも `const v=[m.a,m.a+m.d,b.a,b.a+b.d];push({x1:at/…}` の形をとる。

## 決定

- `_gV(x,m,b)` — 縦ガイド線 (`x` 定数、y は `m`/`b` の y レンジ union)
- `_gH(y,m,b)` — 横ガイド線 (`y` 定数、x は `m`/`b` の x レンジ union)

の pair 定義に集約。`_snapBoxIdx` 前に宣言 (定義が使用サイトより上)。

## 影響

- index.html −98B (523,598 → 523,500)
- 動作変更なし (min/max union の同一式をヘルパ化)
