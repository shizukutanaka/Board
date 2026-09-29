# ADR-0685: アクティブタブをスクロール表示に追従

## Status
Accepted — round435

## Context
`#pgTabs` は `overflow-x:auto` で 64 ページまで届くが、PgDn/リモート切替/チップクリックでカレントが変わってもコンテナのスクロール位置は動かない — アクティブ chip が可視域外に残り、現在ページの視覚的フィードバックが消える。

## Decision
`_pgBar` の on 適用後に `.pg-t.on` へ `scrollIntoView({block:'nearest',inline:'nearest'})` — 水平のみ必要時スクロール、縦は不変。

## Tests
1 ピン: scrollIntoView 呼出
