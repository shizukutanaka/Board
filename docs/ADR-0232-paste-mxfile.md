# ADR-0232: クリップボード mxfile → drawio インポート

## 状態

実装済み (v1.7.289)。

## 背景

drawio 上で ⌘C した図形は非圧縮の `<mxfile>` XML
としてクリップボードに入るが、Board のペーストは
SVG/.board/.excalidraw のみ嗅ぎ分け — drawio 由来の
XML がプレーンテキスト図形として落ちていた。

## 決定

text/plain ペーストの嗅ぎ分け列に `<mxfile[\s>]`
(先頭4KB) を追加し `importDrawioText(s,wp)` へ。
ビューポート中央をドロップ点とする (既存ペースト
経路と同じ座標規約)。

## 影響

- drawio → Board の最速経路 (コピー→ペースト) が
  通る。圧縮ペイロードは既存 `dioCompressed` 警告。
