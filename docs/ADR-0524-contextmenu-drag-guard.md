# ADR-0524: ドラッグ中の contextmenu はジェスチャキャンセル

## 状態

実装済み

## 背景

`contextmenu` ハンドラが無条件に `UI.openCtxMenu` を開いていた。
右クリックが**アクティブな左ドラッグ中**に発火する経路 (ドラッグしながら
の右ボタン押下、ペンのバレルボタン、一部 DE のネイティブメニュー要求) では
メニューがオーバーレイ化し、本来 canvas に届くべき pointerup を呑み込む —
`ptr.down`/`dragKind` が残ったままポインタは論理的にリリースされ、次の
pointermove が宙に浮いたドラッグを続行する (ADR-0521 と同族のスタック経路)。

## 決定

`contextmenu` ハンドラで `if(ptr.down)_cancelPointerGesture();else UI.openCtxMenu(...)`.
通常の右クリック (dragKind=null / ptr.down=false) では従来通りメニューを開く。

## 影響

- ドラッグ中のメニュー干渉を根絶
- +~45B (0523 の fold で相殺)、test.mjs 全緑
