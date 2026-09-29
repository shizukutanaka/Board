# ADR-0655: seenOps トリム下での再適用安全性 (検証済み不変条件)

## Context

`seenOps` は `peer:seq` キーの dedup 集合で、`MAX_SEEN_OPS` 超過時に `_trimSeen` が
先頭 20% を追放する (ADR-0428)。research-improvements.md の残課題に
「seenOps トリム下での重複適用」があった — 追放されたキーの op が再送・再生されると
dedup を素通りして**二度目の適用**が起きる。

設計上の回答: **全 wire op は冪等**であり、再適用は実害を生まない。本 ADR はその不変条件を
行動テストで固定する。

## Invariants (行動テストで固定)

dedup キー追放 (seenOps.clear 相当) 後の再適用:

| op | 再適用の結果 | 機構 |
|---|---|---|
| `add` | `byId` ガードで no-op、二重登録なし | 存在ガード |
| `upd` | 同じ絶対 patch を書き直すのみ | 絶対値書き戻し |
| `zorder` | 自身が刻んだ `wc[id].frac` で棄却 | ADR-0653 LWW |
| `del` | `byId` 不在 → スプライス対象なし | 存在ガード |

`move` は絶対位置送信のため同様に冪等、`replace`/`clear` は `_lastRep` 因果順序で
(ADR-0614) 同一 op の再適用は staler として棄却される。

## Consequences

- `_trimSeen` の追放は「dedup の記憶喪失」ではなく「冪等性への降格」 — 安全側に倒れる。
- 二度適用を前提にできない op は設計上存在しない (存在/絶対値/時計の3機構で担保)。
