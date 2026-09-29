# ADR-0393: .board ファイルの viewport 往復

## 状態
実装済 (v1.7.433)

## 背景
`exportBoard` は `{v,docName,shapes}` のみを書き出しており、保存時の視点位置/ズームが
`.board` 再読込で失われていた。共有リンク側は ADR-0112 で `viewport` を同梱済み
(「受け手が送り手の視点で開く」)で、ファイル経路だけが未対応だった。Excalidraw も
appState の scrollX/scrollY/zoom を scene ファイルで往復する。

## 決定
- `exportBoard`: 共有リンクと同じ丸め (`toFixed(2/2/4)`) で `viewport` を emit。
- `importBoard`: `importFromHash`/`Persist.load` と同一の検証パターン
  (有限値 3 項目 + `zoom>0` + `clampZoom`) で採用。不正な viewport は形状を採用して
  視点のみ既定値のまま (部分採用)。

## 断念した代替案
- viewport を保存しない現状維持 — 自分のファイルを開き直しても視点が飛ぶ実害が残る。
- 無検証で `Object.assign` — 負/NaN zoom で canvas が壊れるため不採用 (既存パターン準拠)。
