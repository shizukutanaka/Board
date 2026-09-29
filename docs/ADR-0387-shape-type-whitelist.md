# ADR-0387: validShape の型ホワイトリスト

## 状態
採用 (v1.7.430)

## 背景
`validShape` は `!s.type` で型の存在のみ検査し、**未知の型を通していた**。
リモートの `add`/`clear` op、.board インポート、共有リンク経由で
`{type:'triangle'}` のような図形が入ると: `_apply` は splice して永続化するが
`drawShape` の `default:break` で描画されないゴースト図形が残る。`w`/`h` を
持たない型は `G.bbox` が NaN を返し、スナップ/ヒット判定へ NaN 伝播する。

## 決定
`_TYPES=new Set([10 型])` を validShape 先頭で検査。marker は pen に帰着する
ツール名であって型ではないため対象外。import 系中間型 (rectangle/freedraw/
excalidraw) は取込時点で既に正規化済み。

## 影響
未知型は add/addMany/clear/snapshot/.board/share-link の全経路で棄却。
