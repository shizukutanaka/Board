# ADR-0691: presence 送出順不変条件の文書同期

## Status
Accepted — round441

## Context
0689/0690 で確立した「`pg` 同梱の presence 送信は `curPg` 代入の後」を
architecture.md のマルチページ節へ明文化 — 将来の経路追加が同じミスをしないよう
不変条件として固定。

## Decision
コード変更なし。docs のみ。
