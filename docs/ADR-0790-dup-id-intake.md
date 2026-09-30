# ADR-0790: Wholesale shape-list intake dedupes ids (keep-last)

## Status
実装済み (v1.7.816)

## Context
`.board` file import、共有リンク adopt、IDB backup restore の3系統と
remote 'replace' op の `after`/`before` 採用は、id 重複チェックなしに
図形リストをそのまま格納していた。重複 id を持つ2図形があると
`shapes[]` には2件残るが `byId` は最後の出現のみを指す (Map.set
last-wins) — 先に来た方は描画・永続化されるのに全ての op
(del/upd/move/select) から到達不能な幽霊になる。

悪意のある .board ファイルや hostile peer の 'replace' で、
全ピアに半永久的な幻影図形を注入できた。

## Decision
`_uniq(a)` — 逆順走査で LAST 出現のみを残す id dedupe:

- 全 `_rs` (wholesale swap) サイトで内部適用 — 正規リストでは no-op。
- 'replace' apply の `next` push ループで適用。

keep-LAST を選んだ理由: byId 索引の構築が forward iterate + `set` で
last-wins なため、残す方を last に揃えると索引とリストが常に一致する。
keep-FIRST だと byId が drop 済みオブジェクトを指して逆の幻影になる。

add/addMany/pageAdd/del-undo の per-item `byId` ガードは既に同型の
防御を持つ (後から来た同 id を棄却) — 本 ADR は残った「リスト一括
採用」経路のみを塞ぐ。

## Consequences
- 全 intake で `shapes` と `byId` の id 整合が不変条件に。
- 検証層 (validShape) ではなく採用層で dedupe — 重複は
  「malformed」ではなく「意味的に冪等化可能」なため、reject ではなく
  吸収で収束する LWW 哲学と一致。
