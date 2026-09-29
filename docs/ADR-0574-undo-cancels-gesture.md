# ADR-0574: ドラッグ中の undo/redo はジェスチャを先にキャンセル

## 状態
実装済み (v1.7.602)

## 背景
move/resize/rotate 等のドラッグ系ジェスチャは in-place 変更し、pointerup で
`before=dragStartShapes` スナップショットの op を記録する。途中で ⌘Z/⌘Y を
押すと `_apply` がジェスチャの最中に逆適用を実行し、(a) undo で図形が消えた
場合はデッド id への op が記録され、(b) 位置が戻された場合は before が
pre-undo 座標で記録される — いずれも意味のない op になる。

## 決定
keydown の ⌘Z/⌘Y 経路の前に `ptr.down` なら `_cancelPointerGesture()` を挿入
(Esc と同じ優先順位)。in-place 変更は元に戻されてから undo/redo が走る。

## 影響
- mid-gesture undo が必ず正しい before を持つ op を記録する
