# ADR-0409: ファイルの viewport/grid 復元を完成 (.excalidraw appState + .drawio grid)

## 状態
実装済 (v1.7.444)

## 背景
ファイルに書き出している視点情報が import 側で読まれていなかった:

- `.excalidraw` emit は `appState:{scrollX,scrollY,zoom:{value}}` と
  `gridSize:null` を書き出す (ADR-0257) のに、import は `elements` しか読まず
  viewport/grid を捨てていた — Board 自身の書き出したファイルでさえ
  視点が往復しなかった。
- `.drawio` emit は `grid="0|1"` + `gridSize` を `<mxGraphModel>` に書き出すが、
  import (ADR-0359) は `dx/dy/zoom` のみ読み `grid` を捨てていた。

## 決定
- `.excalidraw`: `importExcText` に `_vpNull=wp==null` ゲート (ドロップ位置
  指定が無いファイルオープンのみ = ADR-0359 と同じ条件) で `appState` を読み、
  `scrollX/scrollY` → `viewport.x/y`、`zoom.value` → `clampZoom`、
  `gridSize` (`null`=off, number=on) → `state.showGrid`。
- `.drawio`: `_dioVp` に `g:+_ga(m,'grid')===1` を同梱し、viewport adopt 時に
  `state.showGrid` へ適用。

## 影響
- 書き出したファイルを「あの時の視点」で開き直せる — 共有 `.drawio`/.excalidraw
  を受け取った側も発行者の意図した表示範囲とグリッド状態を得る。
- 明示的なドロップ地点 (`wp` 有り) では従来どおり視点を触らない。

## 断念した代替案
- 全インポート経路で常に viewport を採用: ドロップ配置は「ここに置く」という
  ユーザー意図が優先 (現行 `_vpNull` ゲートを踏襲)。
- `state.showGrid` への書き込みに UI 同期を追加: 不要 — `drawGrid` は
  フレーム毎に `state.showGrid` を読む (副作用なし)。
