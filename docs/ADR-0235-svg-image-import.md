# ADR-0235: SVG `<image>` インポート + SVG font属性の共有化

## 状態

実装済み (v1.7.292)。

## 背景

`buildSVG` は画像を `<image href="dataUrl">` で出力
するが、`svgToShapes` は image 要素を読んでいな
かった — 自分の SVG 出力すら往復しない。

加えて raw サイズが 512KB の暴走上限を超過
(59B): excalidraw のコンテナtext リテラルと SVG
text のフォント属性束が複数箇所で重複していた。

## 決定

- **image**: `tag==='image'` を `_svgMPt` で位置
  変換して image 図形へ。`href`/`xlink:href` は
  `/^data:image\//` のみ受理 — 外部参照はオフライン
  原則上取得できず、マッピング自体がサニタイザ
- **dedup**: `_ct()` で excalidraw コンテナtext を
  共有化、`_svgFont()` で font-family/size/weight/
  style/decoration/letter-spacing の束を共有化 —
  約1.7KB削減し上限内へ復帰

## 影響

- SVG 往復で画像が保存される。25MB 上限。
