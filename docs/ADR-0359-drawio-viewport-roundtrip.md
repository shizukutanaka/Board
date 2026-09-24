# ADR-0359: .drawio emit/import — mxGraphModel viewport 往復

## 状態
承認 — round85

## 背景
.excalidraw emit は ADR-0257 で `appState.scrollX/scrollY/zoom` を
往復させているが、.drawio emit は viewport を出力しておらず、
draw.io で開くとデフォルトビューになる + reimport 時にも
視点が失われていた。

## 決定
emit の `<mxGraphModel>` に `dx/dy/zoom` (drawio の pan/zoom
attrs) と `grid`/`gridSize` (Board グリッド表示と間隔20) を出力。
import 側は第1 diagram のモデルから `_dioVp` 経路で受け取り、
ドロップ点指定の無い「ドキュメントとしての取込」時のみ
`state.viewport` へ適用 (ペースト中のビュー破壊を防ぐ)。
zoom は `clampZoom` で不変条件内に収める。

## 影響
+~480B。drawio 往復で視点が保存される。2044 全緑。
