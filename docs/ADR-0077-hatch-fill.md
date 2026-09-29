# ADR-0077: ハッチ / 斜格子フィル (fill style)

## 状態

実装済み (v1.7.135)。

## 背景

Excalidraw の図形は `fillStyle` (`hachure`/`cross-hatch`/`solid`) を
fill 色とは独立に持ち、ハッチは手書き感の主要な演出要素である。
Board は `s.fill` (色 or null) のみで、塗りの「質感」が選べない。
フローチャートや強調表示で「中身を透かしつつ面を主張する」手段が欲しい。

## 決定

- `s.fstyle`: `undefined` (solid) | `'hatch'` | `'cross'`。
  rect/ellipse/diamond のみ対象。fill 色とは直交 — fill=null でも
  ハッチ線だけ描く (Excalidraw 同様、線色は `s.stroke`、不透明度 0.55)。
- 線間隔 `Math.max(6, size*4)`、線幅 `Math.max(0.5, size*0.6)` — size に比例。
- `_hatchSegs(x,y,w,h,gap,cross)` が純粋に 45°/135° 線分列を生成し、
  canvas `_hatchCtx` (`clip()` 後に描画) と SVG `_svgHatch`
  (`<clipPath>` + `<g clip-path>`) が共用 — 実装の単一源。
- canvas では fill→stroke→hatch→label の順 (stroke が path を消費しない
  canvas 仕様を利用し、clip に shape path を再利用)。
- SVG では shape と同一の clipPath 形状タグを `<defs>` に発行し、
  `els.length` を id に使い一意化。回転は `<g>` ラッパの `transform` で
  クリップと線が一緒に回る。
- `cycleFillStyle()` が solid→hatch→cross→solid を `style` op で巡回
  (ADR-0073 と同型)。ctx メニューは box 型選択時のみ表示。
- copyStyle/pasteStyle のクリップボードに `fstyle` を追加し、
  スタイル適用でも伝搬する。

## 断念した代替案

- **パターン画像/CanvasPattern**: 生成オフスクリーンの管理とズーム連動が
  重い。直線パターンなら線分で十分。
- **fill 色にハッチ専用色を追加**: 色と質感を混ぜると行列が爆発する。
  Excalidraw が分離している通り、直交 props が正しい。
- **全型対応**: pen/text では意味をなさないので box 型のみ。

## 影響

- 新規 prop `s.fstyle` — op/style/RTC/永続化は既存経路に自動乗車。
- hit/bbox/minimap は幾何不変のため無変更 (minimap は fill のみ描画、
  ハッチ省略 — 既存の minimap 簡略化と同じ判断)。
- `_drawBoxLabel` はハッチの後なのでラベルはハッチ線の上に描かれる。
