# ADR-0713 — add/addMany backward も locked skip (存在収束)

## 状態
採用 (v1.7.739)

## 文脈
`del` forward は `byId?.locked` で skip するため、undo-wire の `del` op は
lock 済み図形をピア側で残す。一方 `add`/`addMany` の backward (undo =
追加した図形の除去) は無条件で splice していた → forward↔undo 間に lock
が届くとローカルだけ図形を消しピアは残す = **存在レベルの発散**。

## 変更
- `add`/`addMany` backward が `byId(id).locked` を見て splice を skip
  (del forward と同じゲート)。生存する図形の `_wc`/`_psc` キャッシュも
  消さない — 図形が残る以上パージは腐敗
- ADR-0712 と合わせて locked parity が完結: 全 backward 経路で
  「ピアの forward が skip する条件」をローカルも skip
