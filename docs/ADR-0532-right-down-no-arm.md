# ADR-0532: 右ボタンの pointerdown は ptr.down を立てない

## 状態

実装済み (v1.7.560)

## 背景

ADR-0524 (ドラッグ中の contextmenu でジェスチャキャンセル) の副作用:
`pointerdown` が `if(e.button===2){return}` より**前**に `ptr.down=true` を
立てていた。macOS/Linux では contextmenu が **mousedown 時点**で発火する
(Windows は mouseup) ため、何もドラッグしていない素の右クリックでも
`ptr.down` が既に true → ガードが「ジェスチャ中」と誤認して
`_cancelPointerGesture()` を呼び、**コンテキストメニューが二度と開かない**
という実害が起きていた。実ブラウザ検証 (macOS, real CGEvent) で確認。

## 決定

`if(e.button===2)return` を `ptr.down=true` より前に移動。右ボタンの down は
`setPointerCapture` 後に即 return し、ptr 系の状態を一切立てない。
ドラッグ中の右クリック (左ボタンで armed 済) は引き続き
contextmenu → `_cancelPointerGesture()` で正しくキャンセルされる。

## 影響

- macOS でコンテキストメニューが開かなかった回帰を解消
- Windows 動作は不変 (contextmenu は mouseup で ptr.down は既に false)
- PU ハンドラの `if(!ptr.down)return` 早期 return で右 up は安全に no-op
- test.mjs に順序ピン (0532) を追加
