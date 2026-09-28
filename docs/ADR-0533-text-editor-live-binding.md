# ADR-0533: openTextEditor は live 図形を再解決する

## 状態

実装済み (v1.7.560)

## 背景

`Store._apply` の `add` は `_sh().push(clone(op.shape))` — 盤面に載るのは
**クローン**で、`beginText`/`_stickyChain`/`createShapeKbd` 等が
`openTextEditor(s,true)` に渡す `s` は clone 前の**分離オブジェクト**だった。

ブラー時のコミット (`resizeAfterTextEdit`) は `s.text=text` を分離側へ書き、
history 側は `_hi()[_hx()].shape=clone(s)` で正しくパッチされるため、
**ローカルの live 図形だけが `text:''` のまま残る**。実ブラウザ検証で 5/5
再現: 新規 text/sticky がタイプ内容を失い不可視になる (undo+redo や再読み込みで
復活するため気付きにくい)。ピアは `_syncTextFinalize` の `upd` で正しい
テキストを受け取るため、ローカル限定のずれだった。

## 決定

`openTextEditor` の先頭で `s=byId(s.id)||s` — 分離参照が来ても常に live 図形に
付け替える。既存図形経路 (hit/nx) は既に live なので同一オブジェクトが返り無害。

## 影響

- 新規テキスト/付箋がタイプ内容を正しく保持 (ローカル即時反映)
- test.mjs にピン (0533) を追加
