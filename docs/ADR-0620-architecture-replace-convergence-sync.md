# ADR-0620: architecture.md への 'replace' 収束系同期

## 状態
実装済 (v1.7.647)

## 背景
ADR-0613..0619 で 'replace' op の wire 収束系が完成した (wire 許可 →
全順序 marker → undo 伝播 → commit marker → snapshot 因果順序 →
nameTs LWW → ルーム切替リセット) が、`docs/architecture.md` の wire 節は
これらを記述していなかった — 「全置換がどう収束するか」は設計書から
読み取れない状態だった。

## 決定
wire ライフサイクル節に **'replace' 収束** 項目を追加し、
`state._lastRep` (最新適用 swap clock) と `rep`/`nameTs` marker の
役割を一文脈で文書化。併せて **ルーム切替 hygiene** 項目に ADR-0619
(marker リセット) を追記し、持ち越し禁止リストを完全化した。

## 影響
- 今後の変更者が causal marker の存在と責任を設計書から発見できる
- コード変更なし (ドキュメント同期のみ)
