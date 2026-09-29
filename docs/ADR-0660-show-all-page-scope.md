# ADR-0660: 「すべて表示」を現ページに限定

## Status
Accepted — round408

## Context
`showAllShapes` (ctx メニュー「すべて表示」) は `state.shapes` の全 `visible:0` を剥がしていた。多ページ化 (ADR-0646) 以降、**別ページで意図的に隠した図形まで一括で露出**させてしまう — 「すべて消去」が `doClearAll` でページスコープ化済みなのと不整合。

## Decision
ループに `!_pgOk(s)` を追加し、現ページの非表示図形のみを対象にする:

```js
if(_sv(s)||!_pgOk(s))continue;
```

`ctxShowAll` の表示条件 (`_sh().some(_hd)`) は全体走査のまま — 他ページに hidden があってもメニューは出るが、適用は現ページに限られる (次ページへ移れば再度出る)。単一ページでは従来と完全に同一。

## Consequences
- 見えないページの状態を勝手に変えない — undo/ワイヤ収束の驚きを解消
- `.board`/snapshot 経由のページ構造は無変更

## Tests
- 現ページの hidden は露出、別ページの hidden は維持 (behavioural)
- 述語 `!_pgOk(s)` のソースピン
