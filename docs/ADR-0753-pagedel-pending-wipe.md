# ADR-0753: pageDel の `_pcC` は駐車 img 参照を全域で wipe — straggler 解決が安全網

## Status: Implemented (regression pin)

## Context

`_pgDel2` (pageDel apply) は末尾で `_pcC()` を呼び、`_penCache` と
`Net._imgPending` を**全域クリア**する。ページ単位ではなく全体の purge であり、
**生き残るページのメンバー**が駐車中の `img` 参照 (blob 未着) も巻き込んで消える。

これは設計上安全: ADR-0629 の straggler 経路が、blob 到着時に `_sh()` 全域を
`s.img===key` で走査して `dataUrl` を解決する。`_imgPending` はあくまで fast
index であり、wipe されても解決自体は失われない。

## Decision

両側面を回帰ピン化:

1. pageDel 適用後に `_imgPending` が生き残りメンバー分も空になる (wholesale)。
2. その後届いた blob が straggler 経路で `dataUrl` を解決し `img` 参照を落とす。

## Consequences

- 全域 purge 依存の安全性は監査済み (呼び出しコストは単調で、解決は正しい)。
- 本不変条件が壊れると (例: straggler 走査の除去)、pageDel が他ページの画像を
  永久破壊する — test が即検出する。
