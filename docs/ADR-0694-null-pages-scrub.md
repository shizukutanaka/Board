# ADR-0694: ページ集合無しへの移行で s.pg を全 scrub

## Status
Accepted — round444

## Context
`pages` が null になる経路 (pageDel 最終ページ・`_pgAdopt(null)` — replace/import で
pages 無しのボードへ乗換) で、図形の旧 `s.pg` が残存した。後続 `pageAdd` は
`!s.pg` ヒールのみ行うため、stale pg を持つ図形は新しいページ集合で
`_pgOk` 不成立 → 全ページ不可視 (0663 が `pg===削除id` のみで止めた残穴)。

## Decision
`_pgHealS` を on/off 双方責務へ拡張: `_pgOn()` 時は未知 pg→`?` ヒール、
off 時は `delete s.pg` 一括 scrub。pageDel 最終ページも `_pgHealS()` 呼出へ統一。

## Tests
1 assert: `_pgAdopt(null)` で stale `s.pg` が除去される
