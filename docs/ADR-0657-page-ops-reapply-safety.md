# ADR-0657: ページ op の再適用安全性 (ADR-0655 の拡張検証)

## Context

ADR-0655 は seenOps 追放後の再適用が全 op で無害であることを固定したが、多ページ系
(`pageAdd`/`pageDel`/`pageName`) は当時未検証だった。これらは「存在集合」への書き込みで、
冪等性が最も破れやすいカテゴリ。

## Invariants (行動テストで固定)

| op | 再適用の結果 | 機構 |
|---|---|---|
| `pageAdd` | `_pgById(op.id)` 既存 → push せず、`shapes` は `byId` ガード | 存在ガード (二重) |
| `pageName` | 同 ts → `ts>=p.nts` で同名再書きのみ | nts LWW (ADR-0646) |
| `pageDel` | `findIndex(op.id)<0` → 即 break | 存在ガード |

`pageDel` の backward (undo) 側も `byId` ガードで復元形状を二重 push しない。

## Consequences

- seenOps 追放の安全性証明が wire REMOTE_OPS 全種に拡張 —「トリム後も発散しない」が
  ページ体系を含めて網羅された。
