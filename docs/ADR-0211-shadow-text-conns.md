# ADR-0211: テキスト・コネクタのドロップシャドウ

## 状態

実装済み (v1.7.269)。

## 背景

ADR-0194 の `s.shadow` は rect/ellipse/diamond/image 限定で、
draw.io がシャドウ可能なテキストとコネクタには届かなかった
(ctx ゲートで物理的に設定不可)。

## 決定

- canvas: `case 'line'`・`drawArrow`・`drawText` に同じ
  `rgba(15,23,42,.22)/blur10/dy3` ブロックを追加。
  `_drawConnLabel` は save 直後にシャドウをクリア — ラベル
  pill が二重シャドウにならないよう保護。
- SVG: コネクタの全ストローク要素 (curve/straight/elbow/way
  の path・line・polyline、line+arrow 両型) に `${_sh}`、
  テキスト `<text>` にも同 filter。
- `toggleShadow`/ctx ゲートに 'text','line','arrow' を追加。
- drawShape epilogue に無条件の shadow クリアを追加 — 新規
  case が忘れても次図形に漏れない防御。

## 断念した代替案

- **コネクタラベルにも影**: ラベル pill の二重影は汚いため
  本体のみに限定 (draw.io もラベルは別オブジェクト扱い)。

## 影響

- ctx「影 (ドロップシャドウ)」が text/line/arrow でも出る。
  SVG エクスポートは feDropShadow filter で同一外観。
