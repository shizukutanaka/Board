# ADR-0787 — wire 境界の文書同期 (0775–0786 期)

- 日付: 2026-09-29
- 状態: 実装済み (docs のみ)

## Context

ADR-0775–0786 で wire intake の健全化が一段走ったが、architecture.md の
wire 境界節は ADR-0603 までの規則しか述べていなかった。

## Decision

同節へ3箇条を追記 — コードの実規則と1対1対応:

1. **clock 本体も bounded** (0776/0779/0780): peer/seq/namePeer の文字列長、
   pageDel kill-set 必須、'?' スタブ heal。
2. **蓄積量はバイトで縛る** (0781–0785): img スロット 12MB・_imgChunks
   集計 24MB・snap/opc 24MB・_dcQ 32MB・_imgIn 64MB — 攻撃者駆動保持量
   ~112MB まで圧縮。
3. **再組立てに TTL** (0786): `_reapFrags` が 60s アイドルスロットを退避。

## Consequences

設計書が実装を再び正確に写す。index.html / test.mjs 変更なし (v1.7.813
据置きテスト全緑)。
