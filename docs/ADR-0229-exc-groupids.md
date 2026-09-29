# ADR-0229: excalidraw groupIds の往復復元

## 状態

実装済み (v1.7.286)。

## 背景

エクスポートは `e.groupIds` を出力するが、インポートは
読んでいなかった — excalidraw 経由でグループ構造が
全て崩壊していた。

## 決定

`e.groupIds[0]` を `s.groupId` に写す。excalidraw の
ネストしたグループは最外レベルに平坦化 (Board は
単一レベルの `groupId` モデル)。

## 断念した代替案

- ネストを `groupId` 階層で表現: Board のモデル自体が
  平坦で、グループ選択/移動は outermost のみ意味を
  持つ。平坦化が忠実な近似。

## 影響

- excalidraw から取り込んだ図形のグループが保持され、
  export で往復する。container text は ADR-0225 の
  fold で splice されるため親 rect の groupIds が効く。
