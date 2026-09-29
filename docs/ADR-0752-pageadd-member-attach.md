# ADR-0752: リモート `pageAdd` のメンバー図形は `Net._attachShape` を経る

## Status: Implemented (regression pin)

## Context

`pageAdd` wire op は `op.shapes` でメンバー図形を同梱する (ADR-0650 — page
duplicate・.drawio multi-page import・undo-wire `addMany` 合成)。wire 上の
image 図形は `dataUrl` を持たず `img` 参照のみ (ADR-0069 `_imgSlim`)。

受信側の `pageAdd` apply (forward) はメンバーごとに `Net._attachShape(clone(sh))`
を呼ぶ — これが参照を `_imgPending` へ駐車し、blob 到着時に `dataUrl` を解決する
(既到着なら即解決)。この呼び出しが欠けると image メンバーは永久に broken
placeholder のままになる。

## Decision

回帰ピンを追加 (test.mjs):

- 未解決 `img` 参照のメンバー → `_imgPending.get(id)===key`
- `_imgIn` 既着 blob のメンバー → `dataUrl` 即解決、`img` 参照除去
- メンバーの `pg===op.id` 帰属 (ADR-0708 と併せて担保)

## Consequences

- 添付経路の抜けは test で即検出される。
- 同種の attach は `del`/`clear`/`replace` backward・`replace`/`addMany`/`add`
  の forward 各所に存在し、同じ規則に従う。
