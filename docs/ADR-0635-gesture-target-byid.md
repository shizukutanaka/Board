# ADR-0635: resize/rotate の対象を _sel0 → byId(orig.id)

- 状態: 実装済
- 日付: 2026-09-28

## 背景

resize/rotate ジェスチャの対象図形は、ドラッグ適用 (pointermove)、
コミット (pointerup)、キャンセル復元 (`_cancelPointerGesture`) の
3 経路で `_sel0()` — 「現在選択の先頭」— で解決していた。
しかしジェスチャ中に選択は変わり得る: ⌘A 全選択、リモート op
(hide/del)、undo、検索ナビ等。変更後の `_sel0` が別図形を返すと:

- ドラッグの見た目: 別図形がリサイズ/回転する
- コミット: `before`=A の orig、`after`=B の現値という**不一致 upd op**
  を生成し B へ A の幾何を書き込む
- キャンセル: A の orig を B へ復元して上書き

`ptr.resizeOrig`/`ptr.rotOrig` は `clone(onlySel)` で `.id` を保持
するため、id 解決が正しい。

## 決定

4 箇所 (move 適用 ×2、commit ×2… cancel ×2) を `byId(ptr.*Orig.id)`
へ統一。`gOrig`/`gAnc`/`dragStartShapes`/`ebendOrig`/`cbendOrig`/
`wayOrig`/`lblOrig` は既に id-map 経由で非該当。

## 影響

- 対象がジェスチャ開始時の図形に固定 — 選択変更があっても before/
  after が同一図形で自己整合。増分 ~30B。
