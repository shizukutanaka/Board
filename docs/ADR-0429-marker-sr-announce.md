# ADR-0429: marker ストロークの SR announce

## 状態
実装済 (v1.7.464)

## 背景
marker ツールは `pen` shape + `hl:1` の高解像度マーカーで、
`describeShape` は `T.k['pen']` のみを見るため SR には
「ペン」と announce されていた — 視覚上の区別 (太い半透明蛍光線)
と読み上げが不一致。

## 決定
`describeShape` の名解決を `s.hl&&s.type==='pen' ? T.k.marker : T.k[s.type]`
に — `k.marker` キーは ja/en 両方で既存 (ツールボタン共用) のため追加文字列
なし。

## 影響
- DOM mirror・選択 announce・cycleSel で marker が正しい名称で読まれる。
- drawio/excalidraw export は `pen` 型のまま不変 (ADR-0125 の設計通り)。
