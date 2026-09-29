# ADR-0626: 'clear' op を wire 上 'replace'(after:[]) へ翻訳

- 状態: 実装済
- 日付: 2026-09-28

## 背景

`doClearAll` は `{op:'clear',shapes,wc}` を commit する。`Store.commit` は local-origin
op を無条件で `Net.broadcast` するため 'clear' op は wire に送出されていたが、
`REMOTE_OPS` は 'clear' を含まず受信側 `applyRemote` の allow-list で**静かに棄却**されていた。

結果として: ローカルで盤面を全消去してもピアの盤面は残存 → divergence。
以降の snapshot (LWW merge) が欠落図形を送信側へ復元し得るため「全消去がコラボ中に
効かない」実害だった。

ADR-0613-0619 で wholesale の破壊 op である 'replace' は既に wire 化 + 因果順序
(`_lastRep` marker + snapshot `rep` 同梱) が確立済みであり、全消去はその真部分集合
(after が空の swap) に他ならない。

## 決定

**REMOTE_OPS に 'clear' を足すのではなく、`_slimOp` で outbound 'clear' を
`{op:'replace',after:[],afterWc:{},clock:op.clock}` へ翻訳する。**

理由:

- 'clear' をそのまま REMOTE_OPS へ加えると、並行する相手の add/del との順序を
  全順序化する機構がなく (add が到着順で wipe 前後を分かれ、収束しない)、
  'replace' と同等の因果 marker が別途必要になる。
- 'replace' への翻訳なら `_lastRep` marker・snapshot `rep` 同梱・`_undoWire`
  の pre-swap 復元がすべて既存機構のまま動作する。
- inbound の 'clear' は従来通り棄却される — wire は 'replace' のみを運び、
  mixed-version でも受信側は 'replace' (0613+) として正しく適用する。

**sender 側 marker 対称**: receiver は 'replace' 適用で `_lastRep=op.clock` を立てるが、
sender のローカル適用は 'clear' case を通るため marker が未記録だった。このままでは
`旧marker < γ < clearClock` の stale swap γ が sender のみ受理される非対称が残るため、
`_apply` 'clear' forward (REMOTE_OPS 非登録ゆえローカル専用) で同じ clock を
`_lastRep` に記録する。

local undo の粒度は 'clear' op のまま保持 — wire 変換のみで history/undo 経路は不変
(undo-wire は del/clear → addMany を送出し、marker 対称も保たれる)。

## 影響

- 全消去がピア盤面へ伝播する (混在バージョンでは古いピアは従来通り棄却 — divergence は既知の交換条件)。
- 並行 clear-vs-replace / clear-vs-clear は `clockNewer` 全順序で一意勝者を選出。
- stale コメント2件を除去: `_apply` 'replace' の「Local-only — NOT in REMOTE_OPS」
  (0613 で wire 化済み)、`doBeautify` の「like replace/clear」(replace/clear は wire 化済み)。
- spec.md の REMOTE_OPS 列挙を実装へ同期 (addMany 欠落・clear 誤記載を修正)。
