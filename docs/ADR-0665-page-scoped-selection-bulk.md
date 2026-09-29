# ADR-0665: 一括選択系も閲覧ページにスコープ

## Status
Accepted — round415

## Context
0662 (Tab チェーン) と同型穴が一括選択系に残っていた:

- `selectInverse` — `_ulv` 判定だが `_pgOk` 抜き → **別ページの不可視図形が選択に入る**。続く op (delete/style/move) が見えない図形に作用する危険経路
- `selectFrameContents` — 0566 で hidden を除外したが `_pgOk` 抜き → `fid` 帰属が別ページに分岐したメンバーを選択し得る

## Decision
- `selectInverse`: `if(_ulv(s)&&_pgOk(s)&&!_hasS(s.id))inv.add(s.id)`
- `selectFrameContents`: member フィルタに `!_pgOk(s)` 追加 — 「選択 = 閲覧ページで可視」の不変条件に統一

## Tests
- pB 帰属図形が inverse 選択に入らない (1 assert)
- pB 帰属メンバーが frame contents 選択に入らない (1 assert)
