# ADR-0708 — remote pageAdd メンバーの pg を op.id へ正規化

## 状態
採用 (v1.7.734)

## 文脈
remote `pageAdd` のメンバー `op.shapes` は wire の `pg` をそのまま適用していた。
正規の送信側は `s.pg=op.id` を保証するが、wire 上で `pg` が未設定/別ページ
だった場合、メンバーが別ページへ着地して発散し得た。op 意味論として
`pageAdd.shapes` = **このページのメンバー**なので、`pg` は wire を信頼せず
`op.id` へ正規化するのが正しい収束規則。

## 変更
- forward `pageAdd` のメンバー適用を `c2.pg=op.id` 強制へ (正直な送信側では
  no-op、不正形では全ピアが同じ値へ正規化 → 収束)
