# ADR-0688: ローカル pageAdd/Dup に 64 ページ cap

## Status
Accepted — round438

## Context
`_vPages` と 'pageAdd' forward apply は 64 ページ上限を持つが、ローカルの `_pgAdd`/`_pgDup` は未ガード — 64 ページ到達でコミットした pageAdd op が apply 側で silent no-op になり、op-log 汚染+無駄ブロードキャスト+`switchPage` が不存在ページを指しユーザには無反応に見えた。

## Decision
`_pgAdd`/`_pgDup` の先頭で `_ln(state.pages)>=64` → `pgMax` トースト (ja/en 新規) で早期 return。

## Tests
2 asserts: 64 ページで `_pgAdd`/`_pgDup` が集合を増やさない
