# ADR-0521: lostpointercapture でジェスチャキャンセル

## 状態

実装済み

## 背景

pointerdown で `canvas.setPointerCapture` しているが、ブラウザがキャプチャを
**pointercancel/pointerup を発火せずに取り消す**経路がある (別要素への
キャプチャ横取り、要素の DOM 移動、一部 Android のジェスチャ takeover)。
このとき `ptr.down`/`dragKind`/`resizeOrig` 等のジェスチャ状態が残り、
次の pointerdown まで論理的にドラッグ中のままになる — 途中の resize/
move/erase はキャンセル復元されずデータに中途半端な状態が残り得る。

## 決定

`_on(canvas,'lostpointercapture',()=>{if(ptr.down)_cancelPointerGesture()})`
を追加。既存の `_cancelPointerGesture` が dragKind 別に部分変更を復元する
(ADR-0006 系)。通常経路 (pointerup → ptr.down=false → lostpointercapture)
ではガードで no-op。

## 影響

- 取り消し経路での ptr 状態リークと中途変更の残存を防止
- +~150B (コメント込み)、test.mjs 全緑 (ピン1件追加)
