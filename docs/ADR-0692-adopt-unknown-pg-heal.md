# ADR-0692: _pgAdopt の未知 pg ヒール (? ページ生成)

## Status
Accepted — round442

## Context
remote op 経路 (applyRemote) は未知 `pg` を持つ図形へ `?` ページを自動生成するが、
`_pgAdopt` 経路 (.board import / share-hash / snapshot / replace 前後) には同じヒールが
無かった — `pg` が採用集合に存在しない図形は `_pgOk` で全ページ不可視になり
細工/破損ファイルで図形を丸ごと隠せた。

## Decision
`state.pages` 採用直後に `_sh()` を走査し、未知 `pg` 毎に `{id, name:'?', nts:0}`
を push (<64 cap — remote heal と同規約)。`nc` 解決はヒール後に行う。

## Tests
2 asserts: ソースピン + ghost-pg 図形が `?` ページを得る実動作
