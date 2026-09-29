# ADR-0705 — wire pageDel/pageName を適用フィールドのみに縮小

## 状態
採用 (v1.7.731)

## 文脈
`_slimOp` は `wc`/`origSel`/`moved` を wire コピーから剥がす (ADR-0625) が、
page 系 op は以下を全量送信していた:

- `pageDel`: `shapes` (メンバー全形)、`i`、`name`、`bts`、`btp` —
  受信側は forward で `op.shapes=[]` を**再計算**して上書きするため
  送信値は完全な dead weight (メンバー N × slim shape 分の帯域)
- `pageName`: `before`、`bts`、`btp` — forward は `after`+`clock` のみ使用、
  全て undo-domain

## 変更
- wire pageDel → `{op:'pageDel',id,clock}` のみ
- wire pageName → `{op:'pageName',id,after,clock}` のみ
- undo 経路は history 内の非縮小 op を読むため影響なし (`_slimOp` は
  broadcast コピーのみに適用)

## 検証
- 縮小形のソースピン
- 2596→2598 全緑 (wire 適用は round453/454 の実動作テストで担保済み)
