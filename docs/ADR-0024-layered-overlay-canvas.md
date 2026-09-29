# ADR-0024: レイヤードキャンバス — オーバーレイの分離

- ステータス: 採用 (v1.7.82)
- 日付: 2026-09-23

## 背景

`draw()` はシーン (シェイプ・下書き・グリッド) とオーバーレイ (選択枠・ハンドル・
マーキー・スナップガイド・ピアカーソル/選択・レーザー・検索ハイライト・空盤面
ヒント) を 1 枚のキャンバスに描いていた。`invalidate()` は無差別に全面再描画を
要求するため、**エフェメラルな UI クロームが 1px 変わるだけでシーン全体
(数百〜数千シェイプ) が再ラスタライズ**されていた:

- マーキー選択ドラッグ: pointermove ごとに全シーン再描画
- ピアカーソル移動 / ピア選択更新 (RTC): 同上
- レーザーポインタ (プレゼン): 同上
- 検索ハイライト移動: 同上
- `state.hover` 変更: 描画結果に影響しないのに再描画していた (副作用として除去)

先行例: Excalidraw は `staticCanvas` + `interactiveCanvas` の 2 層構造を採用し、
インタラクティブな chrome を上層のみで再描画している (docs.excalidraw.com
@excalidraw/excalidraw renderer)。GPU が 2 枚のレイヤをコンポジットするため、
上層のみの再描画は下層のラスタライズコストを完全に回避できる。

## 決定

`<canvas id="ov">` を `#c` の直上に重ね (同一 CSS ボックス、
`pointer-events:none`)、描画を 2 関数に分割:

- `draw()` — シーンのみ (#c)
- `drawOverlay()` — エフェメラル chrome のみ (#ov)。同一の
  `setTransform(v.zoom*DPR,...)` 世界行列を張るので座標計算は不変

フレームループは 2 フラグ方式:

```
function frame(){
  if(needsRender)draw();        // シーン
  if(needOverlay)drawOverlay(); // クローム
  needsRender=false;needOverlay=false;
}
```

- `invalidate()` — 両方 (従来通り、シーン変更用)
- `invalidateOverlay()` — オーバーレイのみ。マーキー・ピアカーソル・
  ピア選択・レーザー・検索ハイライトの 12 箇所の更新サイトが使用

## 正しさの維持

- オーバーレイは「シーンに依存して描かれる」ため、シーン変更時は両方描く
  (invalidate() が両フラグを立てるので選択枠等がズレない)
- `resize()` は両キャンバスの backing store を同サイズに更新
- **プレゼン時の昇格**: `Presentation.enter()` が `#c` を
  `position:fixed;z-index:8999` に昇格させるため `#ov` も同様に昇格
  (z-index 8999、DOM 順で #c の上、presOverlay 9000 の下)。leave() で復元。
  これが無いとレーザー/選択が #c の背面に隠れる
- `desynchronized` ヒントで入力ラグを増やさない

## 測定 (headless Chrome、300 rect + 20 pen の重い盤面)

| 操作 | 変更前 | 変更後 |
|---|---|---|
| マーキードラッグ 30 move | 30 × draw() (~7ms each) | **0 × draw()**、30 × drawOverlay() (計 0.9ms) |
| 選択変更 | draw() | drawOverlay() のみ |
| レーザー (プレゼン) | draw() | drawOverlay() のみ、実描画確認済 |

## テストフック

`_setOCtx(c)` — `_setCtx` と同型の overlay コンテキスト差し替え。HiDPI 記録
テストと空盤面ヒントテストは drawOverlay() をこのフック経由で検証する。

## 却下した代替案

- **dirty-rect (FT-13)**: 変更領域のみ再描画 — 引き続き有効な将来案だが、
  オーバーレイ分離で「chrome がシーンを引きずる」最大の無駄は解消。
  dirty-rect は drawShape 群に clip 領域を通す設計変更が要り、ROI が下がった
- **OffscreenCanvas + worker**: 描画を worker に逃がす構造 — 単一ファイル・
  file:// 動作・デバッグ性とのトレードオフで不採用
