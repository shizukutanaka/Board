# ADR-0027: op 単位のダメージ伝播 (applyRemote / _apply の局所再描画)

Status: Implemented (v1.7.85)

## Context

ADR-0026 はドラッグ系「ジェスチャ」の局所再描画を入れたが、再描画のもう一つの大きな
発生源は **Store 経由の op 適用** — 特にコラボレーション中の `applyRemote` は各 op
毎に `invalidate()` (= 全面再走査+全面再描画) を発行していた。ピアが連続して図形を
動かす/書き込むと、重い盤面では受信側のフレームが全面再描画で律速される。

FT-13 (dirty-rect) の本体 — op が「どの領域を汚したか」を op 自身から復元する。

## Decision

`_apply` の冒頭で **影響 id の収穫 + 変異前 bbox** を集め、switch 実行後に
**変異後 bbox** を追加して union 化、`invalidateDamage(union)` で局所再描画する:

- id 収穫: `op.id`, `op.ids[]`, `op.shape`, `op.shapes[]`, `op.before`, `op.after`,
  `op.changes[]`, `op.connClears[]` — op 型を問わない汎用収穫(型毎の特別扱いなし)
- 変異前: 収穫 id の `byId` bbox (del/move/upd の消える側・動く側を捕捉)
- ペイロード側: `op.shape/shapes/before/after` の bbox (add/del/clear/replace の
  一方しか存在しない側を捕捉)
- 変異後: 同じ id を再度 `byId` → bbox (add/upd/move の新位置を捕捉)
- 部分パッチ `{id,c:'#f00'}` は `G.bbox` が NaN を返す → finite チェックで除外
  (id 経由の前後 bbox が必ず捕捉するので安全)
- 閾値: union が viewport の 60% 超なら clip せず `invalidate()` に倒す
  (巨大 clip は全面再描画と同コストのため)
- `applyRemote` 末尾の `invalidate()` を除去 (_apply が damage を発行する)。
  `_remoteDelConnFix` (コネクタ端点再結合) は `_apply` 外の変異なので個別に
  `invalidateDamage` する — 旧端点は削除シェイプの damage union 内にあった。

undo/redo も同じ `_apply` 経路で damage を得るが、呼び出し側ハンドラの
`invalidate()` は残置 (人間速度なので全面再描画でもよく、保守性優先)。

## Why sound

- **over-cover は常に安全**: union が必要領域を含んでいれば clip 内の全ピクセルは
  正しい z 順で再描画される。収穫が取りこぼしても `byId` 前後で捕捉、両方とも
  取れない場合のみ `_dmg===null` → `invalidate()` の完全フォールバック。
- damage は世界座標 (ADR-0026 と同じ) — vp/zoom/DPR 変化とは直交。
- `_damage` は `invalidate()` まで縮小しない累積 union → 連続 remote op は
  union が自然に成長し、60% 閾値を超えた時点で全面再描画に自己制限される。

## Alternatives considered

- op 型ごとの damage 導出 (move → dx,dy シフト等): 正確だが 12 op 型それぞれに
  個別ロジック+将来 op 追加時の見落としリスク。汎用収穫は「ペイロードに現れた
  全 id/図形」をカバーするので op 追加に対して自動的に正しい。
- `commit` 側でも caller の `invalidate()` を除去: ローカル op は人間速度で
  利益が薄く、各呼び出し点が他の state 変化 (選択・下書き) を兼ねている場合の
  リスクが上回る。今回は remote 経路のみ。

## Verification

headless Chrome (400 rect 盤面, `frame()` 同期駆動):
- `applyRemote(upd 400×300 移動)` → damage 542×432wu clip、全面再描画との
  ピクセル差分 0
- `applyRemote(del)` → damage 142×132wu、差分 0
- `node test.mjs` 全緑
