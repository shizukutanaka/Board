# ADR-0671: ページスコープ不変条件の文書化 (監査完走)

## Status
Accepted — round421 (docs)

## Context
ADR-0658–0670 の `_sh()` 全走査監査が完走 — 残グローバルサイトは設計通りと確認。
発見した全パターンを4層に分類し architecture.md へ同期した。
また「マルチページ対象外」の stale 記述を除去。

## Invariant
1. ユーザに見える面 (描画・選択・入力・単一シーン export) → `_pgOk`/`_shV`
2. ドキュメント全体の操作 (snapshot/全 doc export/replace) → グローバル
3. 幾何不変条件 (端点追従・z 空間) → グローバル
4. 遷移系 (switchPage/_pgAdopt) → ジェスチャを殺す + 選択は `_ss` チョークポイントで自動洗浄

新規の `_sh()` 走査はこの4層のどれかを判定してから書くこと。
