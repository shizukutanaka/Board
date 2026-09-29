# ADR-0636: _cancelPointerGesture がピンチ状態も掃除

- 状態: 実装済
- 日付: 2026-09-28

## 背景

`_cancelPointerGesture` (Esc / contextmenu / ⌘Z・⌘Y / プレゼン突入)
は `ptr.*` のドラッグ状態だけをリセットし、マルチタッチ系の
`_pointers` map・`_pinchPrev`・`_pinchSnap/_pinchVp` を残した。
二本指ピンチ中にキャンセルが入ると、残った `_pointers` エントリが
指を離した時点の pointerup で取りこぼし pinch 終了処理を発火し、
stale `_pinchSnap` 由来の stray ズームコミットを生じ得た。

`_clearTouchState` (ADR-0608/0632) は同じ掃除を blur/hidden/pagehide
向けに行うが、cancel 経路には接続されていなかった。

## 決定

`_cancelPointerGesture` 末尾で `_clearTouchState()` を呼び、
`_pointers.clear()`・`_pinchPrev=0`・`_pinchSnap` 破棄・
`Minimap.cancelNav()` を cancel 経路へも適用。

## 影響

- ジェスチャ終了後の状態残存ゼロ — 「キャンセルしたはずのジェスチャが
  後から発火」経路を閉塞。増分 ~25B。
