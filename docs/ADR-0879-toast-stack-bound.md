# ADR-0879 — トーストスタックの上限

## Status
採用 (v1.7.905)

## Context
`UI.toast` は同一メッセージの末尾重複のみ除去 (ADR-0389) で、スタック
件数に上限がなかった。バースト時 (リモート op の集中適用・連続操作・
連続エラー) に `setTimeout` 除去 (~1.84s) までの間 div が無制限に
積算し、DOM 肥大 + 画面を大きく覆い尽くす。4枚以上並んでも読めない
ため UX 的にも意味を持たない。

## Decision
append 前に `while(st.children&&st.children.length>=4)_rm(st.children[0])`
で最古を落とす。`children` 欠落スタブ (テスト fake DOM) でも安全に
スキップされるよう `&&` ガード付き。

## Consequence
- トースト div は常時 ≤4 — バースト蓄積経路を閉塞。
- ソースピン: `st.children.length>=4` パターンを静的 assert で固定
  (2906 pass)。
- announce() は単一要素で本件外 (bounded 確認済み)。
