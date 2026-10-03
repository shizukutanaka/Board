# ADR-0967: mid-edit remote lock — blur/commit ハンドラを del parity で fold

## 状態
採用 (v1.7.993)

## 文脈
ADR-0556–0559 は remote **del** mid-edit の fold を実装済み (blur commit が `!byId` で早期 return)。また `_teFollow`/`_lblFollow` は remote **lock** mid-edit を検出して overlay を fold する (`_lk` 分岐、0572/0709)。

しかし commit ハンドラ自体は `byId` の存在のみを検査していた。remote lock が mid-edit に着地すると:

- ピア側は後続の `upd`/`del` を locked gate で drop する (`_apply` 両方向、ADR-0712)
- ローカルは fold と blur commit が同一フレームで競合 — blur が発火すれば `_rcOp(upd)` (テキスト/ラベル) や `_cmt(del)` (空化テキスト) が通り、`resizeAfterTextEdit` や `hit.label=` の live mutation と共に**ローカルだけ状態が進む一方向発散**となる

0964 (mid-gesture lock)、0965 (pending-op mid-run lock) と同型の残面。

## 決定
両 commit ハンドラの fold 条件を `!byId(id)` → `!byId(id)||_lk(obj)` へ拡張:

- `openTextEditor` blur: `if(!byId(s.id)||_lk(s)){state.editing=null;_teTa=null;_rm(ta);_iv();return}` — `resizeAfterTextEdit` の live mutation を走らせず、`_rcOp(upd)`/`_cmt(del)`/`_syncTextFinalize` の全 commit 経路を省略 (typed 文字列は破棄 — remote 状態との一致が正)
- `openLabelEditor` commit: `if(!byId(hit.id)||_lk(hit)){_lblTa=null;_rm(inp);_iv();return}` — `hit.label=` live mutation と `_rcOp(upd)` を省略

`_teFollow`/`_lblFollow` の `_lk` fold は「overlay を畳む」視覚的経路で、本変更は「commit しない」データ経路 — 両者は独立に必要で、handler 側 gate が blur 発火/非発火の両実装を一括担保する。

## 網羅性
- スライダー経路は既に gated (`_sfbBlur`/`_sfbFlush` が `!_lk(s)` メンバー仕分け、0962)
- エディタ内 ⌘B/⌘I/⌘U/⌘⇧X は `_forTxt`→`_lk` で gated
- Escape 経路は commit を外すだけで non-issue

## 検証
behavioural: lock mid-edit で text blur が history/text/editing を不変のまま fold、label commit が history/label 不変で fold、unlocked control は通常 commit。ソースピン2件を 0556/0967 形へ更新。
