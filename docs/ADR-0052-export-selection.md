# ADR-0052 — 選択図形のみのエクスポート

## 状態

実装済み (v1.7.110)

## 背景

Board のエクスポート経路 (PNG / PNGコピー / SVG / PDF / .board) は全て
`state.shapes` 全体を対象とし、`G.bboxAll(state.shapes)` で切り出し範囲を
決定していた。大きな盤面の一部分だけを画像化したいとき、現行では盤面全体を
書き出してから外部ツールでトリミングするしかない。Excalidraw / tldraw は
どちらも選択コンテキストメニューに「selection-only export」を持ち、
部分的な切り出し需要は図解作成ワークフローで日常的に発生する。

## 決定

各エクスポート関数に shape リスト引数を導入し、デフォルトで `state.shapes`
(全面) とした:

```js
function _renderPngBlob(shapes, cb)   // shapes = 対象リスト
function exportPNG(shapes = state.shapes)
function copyPNG(shapes = state.shapes)
function exportSVG(shapes = state.shapes)

function _selShapes(){ return state.shapes.filter(s => state.selection.has(s.id)) }
function exportSelection(fmt){
  const sel = _selShapes();
  if(!sel.length){ UI.toast(t('noSelection'),'warn'); return }
  if(fmt==='svg') exportSVG(sel); else exportPNG(sel);
}
```

選択コンテキストメニューに 3 項目を追加:

- `ctxExportSelPNG` → `exportPNG(_selShapes())`
- `ctxCopySelPNG`   → `copyPNG(_selShapes())`
- `ctxExportSelSVG` → `exportSVG(_selShapes())`

書き出しの全経路 (bbox 切り出し・pad・`exportScale` 上限・背景色・
`buildSVG` の要素生成) を全面エクスポートと共有するため、選択エクスポートは
全面エクスポートの部分集合にしかならない — 出力結果は同一レンダラから生成される。

## 断念した代替案

- **エクスポートダイアログに Selected/All ラジオを追加 (Excalidraw 式)**:
  モーダル設計コストに対し、コンテキストメニュー直結の方がタッチ到達性も
  良い。選択時だけ項目が現れる設計は不要な選択肢を見せない。
- **PDF も選択対象にする**: PDF は印刷志向の全面出力であり部分出力の
  ユースケースが薄い。不要なら後から追加は容易。
- **選択 bbox に pad なしでぴったり切り出し**: 全面エクスポートと同じ
  pad 32 の方が視覚的一貫性が高い。

## 影響

- `exportPNG`/`copyPNG`/`exportSVG`/`_renderPngBlob` のシグネチャ変更は
  デフォルト引数で後方互換。
- 新 op なし (read-only のエクスポート経路)。
- `.board` / PDF は全面のみのまま。
- テスト: presence 3 件 + `_selShapes` フィルタの実動作 1 件。
