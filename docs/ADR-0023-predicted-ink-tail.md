# ADR-0023 — ペン入力の predicted-events 先行インク

- Status: Accepted
- Date: 2026-09-23
- 関連: getCoalescedEvents 導入 (v1.6.22 期), ADR-0018 (描画パス最適化)

## 問題

ペンの下書きは `pointermove` 実イベントの点のみを描く — OS/ブラウザの
タッチスクリーン処理パイプライン分 (数 ms〜1 フレーム) の**見た目の
ラグ**が残る。`getCoalescedEvents` は過去の遅延分を回収するが、未来は
補えない。

## 決定

`PointerEvent.getPredictedEvents()` (Chrome 安定・Safari/FF 未対応だが
feature-detect で no-op) の最後の予測点を `_penPred` に保持し、下書き
ペンの描画直後に「最後の確定点 → 予測点」を1セグメントだけ描く。
次の実イベントが来れば予測点は捨てられる (コミットされない点が
ラスタライズに混入しない)。tldraw / Chromium の "pointer prediction"
解説と同じ発想 — 「予測は描画のみ、状態は汚さない」。

- 読み取り: `contPen` ループ後に元イベント `e` から1回だけ (coalesced
  イベントには getPredictedEvents が無い)
- 保持: `_penPred` モジュール変数 — `state.draft` を汚染しない
  (commit/RDP/persist への混入防止)
- 描画: `draw()` の `drawShape(state.draft)` 直後、pen 型下書きのみ。
  最後の `penWidths` 値で太さを合わせた単純 lineTo
- クリア: `beginPen` / `endPen` / `abortGesture` / ジェスチャーリセット
  経路 (`state.draft=null` の各サイト)

## 却下した案

- **予測点を `d.pts` に入れて描画時に除外**: commit 前に除き忘れると
  破損ペイロードが Store/IDB/共有リンクに流出する — 状態を触らない
  設計のほうが本質的に安全。
- **複数予測点の平滑化描画**: 予測列は数十ms先まで伸びるが、先端ほど
  誤差が大きい。最後の1点への単線は「1フレーム早いだけ」の控えめな
  改善で、誤予測時のちらつきも最小。

## 検証

- `node test.mjs` 全緑 (presence + `_predTail` の単体アサート:
  getPredictedEvents の最後の点を返す / 未対応・空列で null)
- 実ブラウザでは手動確認領域 (headless の合成イベントは predicted を
  返さない) — feature-detect なので非対応環境では完全な no-op
