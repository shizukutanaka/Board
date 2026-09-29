# ADR-0707 — pageDel の 'del' parity (locked 生存 + connClears)

## 状態
採用 (v1.7.733)

## 文脈
`del` op は `sh.locked` メンバーを skip し、結合先削除時に
`computeConnClears` でコネクタ端点を解決済み座標へ凍結+記録する。
`pageDel` (ページ削除) はこの両方を欠いていた:

1. **locked parity**: locked 図形もページと共に消滅 — ロックの
   「通常 op で消えない」約束を破る
2. **dangling 束縛**: 他ページのコネクタが `a`/`b` に消えた図形の
   id を指し続ける — 解決先なしの束縛が残存

## 変更
- `_pgDel2` が dead 集合を locked 除外で計算。locked メンバーは
  `s.pg=firstId` へ再帰属 (firstId=null の空集合経路では un-paged →
  `_pgHealS` が scrub)。全ピアで同一判定 → 収束
- `_pgDel2` が `computeConnClears(dead)` を実行し `op.connClears` に
  記録。後方では `p.before` 復元 (del と同型)
- undo-wire の pageDel も `[pageAdd, addMany]` に `upd{after:c.before}`
  を追加 — ピア側でも束縛が再結合される (del undo-wire と同形)
- forward の空集合経路は `_pgDel2` 共有へ統一 — 2箇所の除去ロジックを一本化
