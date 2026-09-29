# ADR-0763 — spec.md §8 の wire 契約を現行コードへ同期

## Status
Accepted (v1.7.789, 2026-09-28)

## Context
Round513 は `validRemotePayload`/`validClock`/`_lwwDrop`/`_stampWrites`/`applyRemote`/
`_slimOp`/img 参照 (slim→park→resolve・ordered broadcast・IDB GC)/snapshot merge/
Persist 復元の全経路を監査した。**実害は発見されなかった** — 全不変条件は既に
実動作テストで pin 済み (0734–0738, 0745–0747, 0653, 0729–0733 等)。

一方で `docs/spec.md` §8 のワイヤ収束記述が陳腐化していた:

1. **`move` 行が delta 形式のまま** — `{ids:[], dx, dy}` `translate(-d)` と記述するが、
   ADR-0729/0732 で wire move は**絶対位置** `{ids/after/before:[{id,x,y}]}` に移行済み
   (raced 基準の delta は非収束)。undo 側も絶対 `before` 復元 + 軸毎 `_lwwSkip` (0733)。
2. **`zorder` 行に廃止済み旧形式の記載** — `{changes:[…]}/旧 {after:[…]}` と併記するが、
   ADR-0742/0744 で remote zorder は最小デルタ形式のみ、legacy apply 経路は削除済み。
3. **LWW 節の対象列挙が陳腐** — `move`/`zorder` は可換なので LWW 非適用と記述するが、
   0729 で move は絶対 patch LWW、0653 で zorder は per-shape frac LWW、0730 で
   beautify、0705/0716/0734 で page op/存在 op (tombstone + causal marker) へ拡張済み。

## Decision
spec.md §8 の3箇所を現行コードと整合させた。コード・テストへの変更はない。

## Consequences
- spec が「実装と別の仕様」を読ませる誤誘導を解消 (ADR-0001 Step4 の status 矛盾と同型の
  ドキュメント腐敗防止)。
- 監査 round で実害ゼロの場合、ドキュメントの陳腐同期を成果物として採用する慣行を継続。
