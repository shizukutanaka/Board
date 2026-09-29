# ADR-0663: 最終ページ undo で帰属 (s.pg) を掃除

## Status
Accepted — round411

## Context
`pageAdd` の backward (undo) はページ除去後のヒールを「残ページあり」分岐に限定していた: `state.pages` が空になった時 (`!_ln` → `pages=null`) は `s.pg===op.id` の帰属が掃除されない。

到達系列: +Page (pageAdd A → pageAdd B) → **undo 2回** → 全図形が `pg:'A'` (dead id) のまま残る → 再度 +Page → fresh-page ヒールは `if(!s.pg)` にしか触れず、`pg:'A'` の図形は新ページ集合へ再帰属しない → `_pgOk` 偽で**全図形が不可視**。

## Decision
`!_ln(state.pages)` 分岐で `for(const s of _sh())if(s.pg===op.id)delete s.pg` を追加 — ページ集合が消えるなら帰属も消す (単一ページの null-pages モデルへ完全復帰)。

## Consequences
- undo で null-pages 状態へ戻る時、図形の帰属も null-pages セマンティクス (帰属なし) へ一致
- その後の pageAdd/snapshot adopt が正しく再帰属する

## 追記 (round412)
`pageDel` の backward も同じ「削除前ビューへ戻る」ヒールが抜けていた — `_pgDel` は現行ページしか削除しないので、undo 時は `switchPage(op.id)` で復元ページへ着地点を戻す (`_pgFollow` は pageDel を意図的にスキップするため `_apply` 側で処理)。

## Tests
- undo2回→`pg` クリア、再 pageAdd→`pg` 再帰属+`_pgOk` 真 (3 asserts)
- pageDel の undo→`curPg` が復元ページへ + メンバー可視 (3 asserts)
