# ADR-0710 — architecture.md への pageDel parity/member-pg/fold 規則の同期

## 状態
採用 (v1.7.736、docs のみ)

## 変更
- 「改名/削除の収束規則」へ ADR-0707–0709 の3条を追記:
  - pageDel の 'del' parity (locked 再帰属 + connClears)
  - pageAdd メンバー `pg=op.id` 強制正規化
  - 編集 overlay の off-page 畳み
