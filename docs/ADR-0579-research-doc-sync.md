# ADR-0579: research-improvements.md の実装済み記述同期

## 状態
実装済み (v1.7.606)

## 背景
docs/research-improvements.md の「未実装」と書かれた項目のうち、後続 ADR で
実装済みになった3件が「未実装」のまま残っており、残課題の棚卸しを読む人を
誤誘導していた:

- filled-outline パス → ADR-0046 で実装済み (union-of-primitives 塗り)
- `DOC_KEY:prev` 型のセッション間安全網 → ADR-0004 の self-overwrite
  バックアップで実装済み
- 永続的な offscreen DOM ミラー → ADR-0041 で実装済み

残る真の未実装項目 (3者以上の因果順序・再収束・署名付き op) は記述を据え置き。

## 決定
当該3件を取り消し線 + 実装済み ADR 参照へ書き換え。

## 影響
- 調査ドキュメントが残課題の実態と一致
- 新規の監査者が「実装済みだが未実装と書かれている」偽のギャップを追わない
