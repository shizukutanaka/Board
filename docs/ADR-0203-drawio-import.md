# ADR-0203: .drawio (mxGraphModel) インポート

## 状態

実装済み (v1.7.261)。

## 背景

`.board`/`.svg`/`.excalidraw` の3系統しか取り込み経路がなく、
draw.io (diagrams.net) — 事実上の標準の図形式 — からの移行が
手作業だった。非圧縮 .drawio は素の XML で、ブラウザ組込みの
DOMParser で依存ゼロ実装できる。

## 決定

`drawioToShapes(txt)`: `mxCell` 走査で vertex→図形 (style の
ellipse/rhombus/text ヒューリスティック)、edge→arrow
(source/target 結合を Board id へ再マップ、sourcePoint/
targetPoint と points 配列 → waypoints、edgeStyle orthogonal →
elbow)。fillColor/strokeColor/strokeWidth/dashed/fontSize/opacity/
rounded を対応プロップへ。`value` は `<br>` を改行に復元し
DOMParser でタグ除去。

`importDrawioText/File`: importExcText と同一の中央配置+addMany+
選択経路。ドロップ (`.drawio`/`.dio`)、ファイルピッカー (accept
拡張)、両経路。

**圧縮ペイロードは警告**: drawio 既定保存は `<diagram>` 内の
deflate+base64 — オフライン単一ファイルでは inflate できないため
`dioCompressed` トーストで非対応を明示 (黙って落とさない)。
上限 DIO_MAX=20000 セル。

## 断念した代替案

- **pako/deflate を同梱して圧縮対応**: 依存追加・サイズ増と
  非圧縮保存で回避可能 (draw.io 側で Extras→Edit Diagram 等)。
- **drawio 完全スタイル再現**: gradient/泳線/コンテナ等は
  Board に対応物がなく最近傍へ落とす。

## 影響

- フローチャート等の drawio 資産が結合・ラベル・stil 込みで
  移行可能。未知 vertex は rect、未知 edge は arrow にフォールバック。
