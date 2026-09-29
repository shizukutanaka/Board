# ADR-0641: ポインタ系列の実検証 (合成イベント → 実リスナ)

- 状態: 実装済
- 日付: 2026-09-28

## 背景

spec §14.3.1 の残課題に「test.mjs は DOM イベント発火を実検証しない
(harness 制約)」とあった。ジェスチャ層 (PD 腕上げ → PM 追従 → PU
コミット) は `beginPen`/`contPen` の直接呼出しでしかテストできず、
リスナ配線自体の回帰 (右ボタン arm、ptr.down 残留、コミット漏れ) を
検出できなかった。

## 決定

- fake DOM の `getElementById` を per-id キャッシュ `_els` へ変更し、
  `addEventListener` を `el._L` マップへ記録
  (`type` / capture は `type|c`、同一キーは配列で bind 順保持)
- テストは `canvas._L` の capture→bubble 順に合成イベントを発火。
  `pointerId/pointerType/button/clientX/offsetX/修飾キー` の最小フィールドで
  実ハンドラが素通りできることを確認 (`_penPr` は pressure なし→0.5、
  `coalescedSamples`/`_predTail` は API 不在→フォールバック)

## 影響

- ペンストローク (PD/PM/PU → add op)、select-drag (move op)、
  右ボタン非 arm (ADR-0532)、PU 孤立 を実経路で検証。9 asserts。
- 残: レンダリング実体 (ctx 記録は drawShape 個別に存在)、
  マルチポインタ系列 (pinch)。
