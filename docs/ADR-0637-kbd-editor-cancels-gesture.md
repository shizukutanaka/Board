# ADR-0637: Enter 編集オープンも mid-gesture キャンセル

- 状態: 実装済
- 日付: 2026-09-28

## 背景

ADR-0634 でプレゼン突入の同型穴を塞いだが、もう一つの overlay 突入
`editSelectedShapeKbd` (select tool + Enter → `openTextEditor` /
`_openLabelEditorFor`) は未対応だった。ドラッグ中に Enter を押すと
overlay が開き、ポインタキャプチャ継続のドラッグは overlay 裏で進行、
リリース時に不可視の move/resize コミットが発火し得た。

dblclick/ctx メニュー経路は到達不能 (dblclick は pointerup 系列、
contextmenu は ptr.down 時 cancel 済) — キーボード経路が残穴。

## 決定

`editSelectedShapeKbd` 冒頭で `if(ptr.down)_cancelPointerGesture()`
— キャンセルが orig を復元した後で overlay を開く。

## 影響

- overlay 突入系のジェスチャ残存は全経路で閉塞 (プレゼン・編集・
  コンテキストメニュー)。増分 ~30B。
