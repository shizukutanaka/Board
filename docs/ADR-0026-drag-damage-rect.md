# ADR-0026: ドラッグ中の局所ダメージ再描画

- ステータス: 採用 (v1.7.84)
- 日付: 2026-09-23

## 背景

ADR-0024 で chrome を overlay 層に分離した後も、**シーン側のドラッグ操作**
(移動/リサイズ/回転/下書き/消去) は pointermove ごとに `invalidate()` →
全可視シェイプ再描画だった。重い盤面で 1 つの小さなシェイプを動かすだけで
数百〜数千シェイプを再ラスタライズする。canvas2d は前フレームのピクセルを
保持するので、変わった領域だけクリア+再描画すれば済む — 古典的な
dirty-rect 最適化 (FT-13) のうち、**ROI が最大で範囲が限定できるドラッグ局所版**
だけを取り出したもの。

## 決定

`invalidateDamage(r)` (world-space rect) を追加。`invalidate()` は
`_damage=null` にリセットして全面再描画するが、`invalidateDamage` は
`_damage` を **ジェスチャ中累積 union** する (一度の高速ジャンプでも
移動元ピクセルが残らないよう、縮小しない)。

`draw()` は `_damage` があるとき:

```js
ctx.setTransform(world); ctx.clip(dmg); ctx.fillRect(dmg, bg);
// シェイプ走査のクエリ矩形を _view ではなく dmg+margin に差し替え
```

- クエリ矩形にマージン (stroke幅+ラベル+オーバーシュート ~16wu) を付与
- **`ptr.dragStartShapes` のドラッグ対象は grid 状態に依らず必ず描画** —
  doMove は `_invalidateGrid()` を呼ばず in-place 変異するため、ドラッグ中の
  grid は陳腐化しており候補クエリが新位置を拾えない可能性がある
- 下書き (`state.draft`) は clip 内で従来通り描画 (ピクセル被覆は
  cont* 系が報告する damage で担保)

## 対象 (producer)

- `doMove` (移動ドラッグ): bbox(orig) ∪ bbox(new) を累積
- resize/rotate ドラッグ (`applyResize`/`doRotate` 経由の pointermove)
- `contRectLike`/`contLineLike` (下書き矩形/線): prev ∪ new bbox
- `contPen` (ペン): 新点の corridor rect (size+16 margin)
- `eraseAt` (消しゴム): 消去シェイプの bbox

それ以外の全 invalidate() は従来通り全面再描画 (安全側デフォルト)。
pointerup のコミットで通常 invalidate が走り綺麗に締まる。

## 正しさ

- canvas 内容の保持は canvas2d 仕様上保証される (`desynchronized` ヒントは
  合成タイミングのみ)
- clip + clearRect→fillRect(bg) で背景色も正しく復元
- damage 累積により teleport 的な大移動でも古位置が必ず含まれる
- viewport/zoom/DPR 変更は全部 `invalidate()` 経路なので自動的に全面化

## 却下

- 下書きペンの増分スタンプ: `penWidths` は全点の圧力正規化+3タップ平滑に
  依存し、新しい極値で全幅が変わるため stale 判定が脆い
- 全面 dirty-rect (FT-13 完全版): undo/peer-op/import まで矩形追跡するには
  Store 経路の改修が要り、現時点ではドラッグ局所版で主要コストを捕捉済み

## 測定

headless Chrome, 4000 シェイプ盤面での move ドラッグ: 従来 ~X ms/frame →
~Y ms/frame (実測値は PR 記載)。
