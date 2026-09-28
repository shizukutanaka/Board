# ADR-0517: Safari GestureEvent によるトラックパッド pinch-zoom

## 状態

実装済み

## 背景

Board の pinch-zoom は2経路を持つ:

1. マルチタッチ `pointermove` 2点距離比 (iOS/Android タッチ)
2. `wheel`+⌘/Ctrl — Chrome/Firefox のトラックパッド pinch (ADR-0033)

ところが **Safari (macOS/iPadOS) のトラックパッド pinch は `ctrl+wheel` を発火しない**。
Safari は独自の `GestureEvent` (`gesturestart`/`gesturechange`/`gestureend`、
`e.scale` に累積スケール比) を使うため、Safari ユーザのピンチは無反応だった
(Excalidraw/tldraw も同イベントを別途購読している)。

## 決定

`canvas` に GestureEvent リスナを追加:

```js
let _gScale=1;
_on(canvas,'gesturestart',e=>{_pd(e);_pinchSnapNow();_gScale=e.scale},{passive:false});
_on(canvas,'gesturechange',e=>{
  _pd(e);
  const r=_cbr();
  zoomAt({x:e.clientX-r.left,y:e.clientY-r.top},_log(e.scale/_gScale));
  _gScale=e.scale;
},{passive:false});
_on(canvas,'gestureend',()=>{_pinchSnap=null;_pinchVp=null;_iv()});
```

- `zoomAt(sp,delta)` の delta は log スケール (`v.zoom*exp(delta)`) のため、
  `e.scale/_gScale` (累積比 → 前イベント比) を `_log` に通す — 既存タッチピンチと同一規約
- `_pinchSnapNow`/`_pinchSnap`/`_pinchVp` のスナップショットプレビューを共有し、
  ジェスチャ中の滑らかさと終了後の crisp repaint も揃える
- 未知のイベント名は Chrome/FF で不活性 — 素の `_on` 登録でよい

## 影響

- Safari でトラックパッド pinch-zoom が動作 (マウス位置追従 + プレビュー)
- +約 500B。test.mjs 2076 全緑 (ピン1件追加)
- 実機検証は未実施 (この VM は Linux) — イベント名・プロパティは MDN/WebKit 文書準拠
