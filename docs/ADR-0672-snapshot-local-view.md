# ADR-0672: スナップショット取込で受信者のビューを維持

## Status
Accepted — round422

## Context
`_applySnapshot` (full replace) と merge-path の空ページ側が共に `_pgAdopt(msg.pages,msg.curPg)` — **送信者が見ていたページ**で受信者のビューを上書きしていた。ADR-0646 が自ら定めた不変条件「curPg is a LOCAL view filter — peers may sit on different pages」に違反: 再同期 (切断復帰・sync-req 再送) で作業中ビューが送信者のページへ飛ぶ。

## Decision
両パスとも `_pgAdopt(msg.pages,state.curPg)` — ローカル curPg が新集合で有効なら維持、消滅なら `v[0]`。新規 joiner (`curPg=null`) は `pages[0]` に着地 (送信者の居たページではなく文書先頭 — 予測可能)。

`_pgAdopt` は `nc!==state.curPg` の時のみジェスチャキャンセル (0664) — ローカル維持で無用なキャンセルも消える。

## Tests
3 asserts: 再同期のローカル維持・消失時の pages[0]・新規 joiner pages[0]
