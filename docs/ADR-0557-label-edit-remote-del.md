# ADR-0557: ラベル編集の remote-del orphan ガード

## 状態
実装済 (v1.7.585)

## 背景
ADR-0556 の同型。`openLabelEditor` の `commit` は開いた時点の図形 `hit` を
キャプチャし、blur/Enter/Tab で `hit.label=lbl||null` を直書きしてから
`_rcOp({op:'upd',id:hit.id,...})` を commit する。編集中にピアがその図形を `del`
すると `hit` が orphan 化し、dead object への書込み + 履歴に phantom upd が残り、
ピアへも不要な op が飛んでいた。

## 決定
`commit` 冒頭で `if(!byId(hit.id)){_lblTa=null;_rm(inp);_iv();return}` — 図形が
既に消えていれば mutation/commit を一切せず editor を畳む。Enter/Tab/Esc の
明示的な commit 経路も同じガードを通る (Tab chain はガード後に次の label へ進む)。

## 影響
- リモート削除の収束は変わらず、こちらは静かに閉じるだけ
- ADR-0556 と同一パターン — エディタの commit は「対象がまだ存在するか」を最初に確認する
