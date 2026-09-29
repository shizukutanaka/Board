# ADR-0509: ジェスチャ状態 reset cluster の `_zR`/`_zG` 化

## 状態

実装済 (v1.7.542)

## 背景

ポインタジェスチャのキャンセル/コミットで毎回 `state.draft=null;state.marquee=null;...`
の連鎖代入が直書きされていた — 7-field cluster 3 サイト + `guides/readout/bindPreview`
3-field cluster 6 サイト。

## 決定

`_zR=()=>{state.draft=state.marquee=state.guides=state.readout=state.bindPreview=state.measure=state.lasso=null}` と
`_zG=()=>{state.guides=state.readout=state.bindPreview=null}` に集約。
代入の連鎖は JS の右結合で有効 (`a=b=c=null`)。

## 影響

- index.html ~-280B
- リセットの対象セットが一元化 (今後のフィールド追加は helper へ)
