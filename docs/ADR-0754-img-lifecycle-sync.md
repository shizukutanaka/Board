# ADR-0754: architecture.md の img 参照ライフサイクル節を 0752/0753 に同期

## Status: Docs sync

## Context

ADR-0752/0753 で固定した2つの不変条件が architecture.md の「img 参照の再解決」
節に未記載だった:

1. `pageAdd` forward のメンバー図形も `Net._attachShape` を経る (0752) —
   記載の「del/clear/replace の backward、replace の forward」だけでは
   pageAdd の image メンバーが裸 `push` されているように読める。
2. `_pgDel2`→`_pcC()` の `_imgPending` 全域 wipe (0753) — 生き残るページの
   駐車参照も消える点は非自明で、straggler 走査が安全網である理由が必要。

## Decision

同節に2段落追記。両者ともコード変更なしの監査結果の文書化のみ
(version は 1.7.780 へ、CHANGELOG/README/CLAUDE 同期)。
