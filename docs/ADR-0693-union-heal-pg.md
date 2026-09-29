# ADR-0693: snapshot union-heal 側も未知 pg を拾う

## Status
Accepted — round443

## Context
0692 のヒールは `_pgAdopt` 内のみ — snapshot union-heal (自前ページ有りの合流) は
`msg.pages` の unknown だけを追加し、**図形が運ぶ**未知 `pg` を拾わなかった。
既存ページ集合を持つピアが ghost-pg 図形を含む snapshot を受けると
同じ不可視取り残しが起きた。

## Decision
heal を `_pgHealS()` へ切出し `_pgAdopt` と union-heal 末尾で共有。

## Tests
1 ピン: `_pgHealS();_pgBar()` の存在
