# ADR-0667: ホップマーク候補とフレーム命名をページスコープへ

## Status
Accepted — round417

## Context
ページスコープ監査の残サイト2件:

1. `_hopsFor` — コネクタのホップ(交差アーチ)候補が `_pgOk` 抜き → **別ページの線との交差で幻影ホップ**を描く
2. フレーム命名 `Frame ${n}` — 全ページの frame を数える → ページ2の最初のフレームが "Frame 5"

## Decision
- `_hopsFor`: `if(o===s||o.visible===0||!_pgOk(o))continue` — ホップは閲覧ページで可視の交差のみ
- フレーム命名2サイト: `filter(s=>_frm(s)&&_pgOk(s))` — ページ毎に独立した採番

結合コネクタ掃引 (`ptr.gAnc`/`_bc`/`_rc`) は端点追追従の幾何不変条件のためグローバル維持 (設計通り)。`doUngroup` も「グループ自体の消滅」でグローバル正しい。

## Tests
- ホップ走査・フレーム採番の `_pgOk` 化ピン (3 asserts)
