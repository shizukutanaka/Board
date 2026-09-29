# ADR-0556: テキスト編集中のリモート削除で phantom op を防ぐ

## 状態
実装済 (v1.7.584)

## 背景
`openTextEditor` の blur ハンドラは開いた時点の図形オブジェクト `s` で確定する。
編集中にピアがその図形を `del` すると、ローカルの `s` は orphan 化する (byId で
もう見えない) が、blur は依然として `resizeAfterTextEdit` で `s` を書き換え、
`{op:'upd'}` / `{op:'del'}` を commit + broadcast していた:

- 削除済み id への `upd` は forward で `byId` miss → apply 自体は no-op だが
  履歴に「存在しない図形への upd」が残り、ピアにも不要な op が飛ぶ
- `isNew` 経路では `Store.undo()` で空白 add を巻き戻し、その後に
  `_syncTextFinalize` が del op を broadcast — ピア側は既に削除済みなので
  余計な往復になる

## 決定
blur 冒頭で `if(!byId(s.id)){state.editing=null;_teTa=null;_rm(ta);_iv();return}` —
図形が既に消えていれば commit/broadcast を一切せず、editor を畳んで終了する。
`resizeAfterTextEdit` の s 書換えもスキップするので orphan へのメモリ書き込みも
発生しない。

## 影響
- リモート削除の収束状態は従来通り (del 側が connClears を伴う) — こちらはただ静かに閉じる
- isNew でローカル履歴に add op が残るのは意図的: 実際に add して消された、という事実の記録。
  Ctrl+Z で no-op 復元されるだけで実害なし
