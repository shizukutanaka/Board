# ADR-0230: excalidraw 装飾fidelity + ヘッド 'none' レンダリング

## 状態

実装済み (v1.7.287)。

## 背景

excalidraw インポートの `st()` マッパーは
stroke/fill/size/opacity/dash のみ — ハッチ塗り・
角丸・テキスト揃え・矢印ヘッドスタイルが全て
喪失していた。さらに `endArrowhead:null` (ヘッドなし
矢印) に対応する Board 側表現がなく、無条件に矢印
ヘッドを描画していた。

## 決定

- **import**: `fillStyle:'hachure'|'cross-hatch'`→
  `fstyle`、`roundness`→`r`、text `textAlign`→`align`、
  `endArrowhead`→`head` ('none'/'dot'/'open')、
  `startArrowhead`→`start`
- **render**: `_arrowHeadShape`/`_svgArrowHead` に
  `style==='none'` の early-out を追加 — 'none' が
  正規のヘッドスタイル値として扱えるようになった

## 断念した代替案

- ヘッドなし arrow を type:'line' に降格: startArrowhead
  が付くケースで情報損失。'none' 値の導入が正確。

## 影響

- excalidraw 由来の装飾が保持される。'none' ヘッドは
  ctx メニューの巡回 (HEAD_STYLES) には含めず、
  インポート専用の値として扱う。
