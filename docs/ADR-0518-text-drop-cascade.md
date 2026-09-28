# ADR-0518: 非ファイル drop を共有テキストカスケードへ

## 状態

実装済み

## 背景

キャンバスの `drop` ハンドラは `dataTransfer.files` だけを見ていた:
`.board`/`.excalidraw`/`.drawio`/`.svg`/画像ファイルは取り込めるが、
**ファイルを伴わないドラッグ (テキスト選択範囲、リンク、マークアップ片) は
何も起きなかった**。ペースト側は ADR-0042/0044/0099/0115/0232/0273 で
`text/plain` の全カスケード (SVG → .board → .excalidraw → mxfile → TSV →
平文) を持つため、同じコンテンツでも「ペーストは効くがドロップは無視」という
非対称になっていた — 外部エディタ/ブラウザからのドラッグ&ドロップ取込は
ホワイトボードの標準的導線 (Miro/FigJam は text/URL ドロップで shape 化)。

## 決定

ペーストのテキストカスケードを `function _textCascade(s,wp)` に抽出し、
両経路で共有:

- **paste**: `_textCascade(_St(tx||''),_midV())` — 従来通りビューポート中央。
  消費時に `_pd(e)`、非消費時は `doPaste()` (内部 clipboard) へフォールバック
- **drop**: `dataTransfer.getData('text/plain') || getData('text/uri-list')`
  を `_textCascade(s,_s2({x:e.offsetX,y:e.offsetY}))` — **ドロップ地点**に配置
  (`uri-list` は text/plain を載せないリンクドラッグ用)

`_osClip` エコー検出 (ADR-0516) はヘルパー内に保持 — drop 側でも同一判定が効く。

## 影響

- テキスト/URL/SVG マークアップ/.board JSON 等のドラッグドロップが
  ドロップ位置に図形化 — ペーストと完全な機能対称
- ペースト側の重複カスケード (~60 行) がヘルパーに集約され、mxfile の
  中央座標二重計算も `_midV()` に統一
- 実害修正: `importSvgText`/`importExcText`/`importBoardText`/`importDrawioText`
  は全て `wp` 引数対応済みのため、drop 位置指定は既存シグネチャに乗るだけ
- test.mjs 2077 全緑 (ピン1件追加 + 3件のリテラル同期)。523,258B < 524,288
