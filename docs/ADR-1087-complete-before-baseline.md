# ADR-1087: パッチ系 op の `before` は完全ベースラインを要求する

**Status**: Accepted (round837, v1.8.111)

## Context

ADR-1085 で wire `before` が undo 専用ではなく**受信側 per-prop LWW の変更検出ベースライン**であると確定した (`_chg(before,after,key)`: ベースラインに無いキーは常に changed → stamp+apply)。ADR-1086 は before-less `move` を拒否したが、**sparse `before`** (キー欠落エントリ) が残存:

- `{op:'move', before:[{id:'s1',x:0}], after:[{id:'s1',x:9,y:9}]}` — `y` が before に無いため `_chg` は changed 判定。送信者が y を触ったふりができ、ピアの並行 y 書き込みを踏む。
- 同型: `style`/`resize`/`align` の `before:[{id}]` (キーなし) は全 after prop を stamped 化 = before-less と等価の発散窓。

## Decision

`validRemotePayload` に `cov(A,B)` を導入 — **id 単位のキー集合一致** (双方向):
emit がキー等価ペアを生成するファミリ (move/style/resize/align) は完全ベースライン必須。
`zorder` は `changes[].before`/`after` 両方必須、`group` は `before` が全 `ids` メンバをカバー必須。

**Exempt by design**:
- `upd` — finalize op は changed キーのみ記録する仕様 (5677)。
- `beautify` — retype は props を新設する (`{type:'pen',pts}` → `{type:'rect',x,y,w,h}`)。新規 prop に baseline は存在しないため「missing = changed」はここでは**正しい**セマンティクス。

## Verify

全 emit サイトを点検済み: move `{id,x,y}` ペア (ADR-0729)、style 同キーペア、resize `{id,w,h}` ペア (⌥arrow; ドラッグ経路は `upd` full-clone)、align full-clone/lock ペア — いずれもキー等価。undo-wire の before/after swap は等価集合を保存するため自動的に有効。

## Consequences

- 偽造 sparse-before op は intake で棄却 → 並行編集 stomp の残穴閉塞。
- 旧契約の sparse fixture は移行 (ADR-0373/0568/0969/_nugLock/0730系)。
- 10 挙動ピン追加 (sparse 拒否4 + 余剰キー拒否 + 受理3 + group 部分カバー拒否 + exempt2)。

## References

ADR-1085 (before = 変更検出ベースライン), ADR-1086 (move before 必須), ADR-0730 (beautify retype), ADR-0729 (move 絶対座標), ADR-0377/0373 (patch 構造検証)。
