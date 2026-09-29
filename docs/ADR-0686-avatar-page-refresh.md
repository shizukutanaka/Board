# ADR-0686: ページ変更でピアアバターの `· page` ツールチップも更新

## Status
Accepted — round436

## Context
アバターのツールチップ `id · PageName` は `refreshPeers()` で構築されるが、同関数はピア join/leave/presence 時のみ呼ばれる — ページ集合の変化 (remote rename/add/del) ではアバター側が次の presence tick まで旧ページ名を表示し続けた。

## Decision
`_pgBar` (ページ集合/UI 変化の唯一の集約点) から `UI.refreshPeers()` — 稀なイベントに対する O(peers) のみ。

## Tests
1 ピン: 呼出行
