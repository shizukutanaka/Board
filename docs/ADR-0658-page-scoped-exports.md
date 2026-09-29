# ADR-0658: 単一シーンエクスポートをカレントページ限定に

## Status
Accepted — round406

## Context
ADR-0646 の多ページ化で `state.shapes` は全ページの図形を同一座標空間に保持する (帰属は `s.pg`/位置推定)。全盤面エクスポート系は `_sh()` を素通ししていたため、複数ページの図形が**同一座標で重畳**して書き出されていた:

- `.excalidraw` — フォーマットにページ概念がなく、全ページが1シーンに重なる
- PNG (`exportPNG`/`copyPNG`) / SVG (`exportSVG`/`copySVG`) / PDF (`exportPDF`) — raster/vector も同様に重畳

`.board` (`exportBoard`/`copyBoardJSON`) は `pages`+`curPg` を同梱する往復型で正しい。`.drawio` は ADR-0650 でページ毎 `<diagram>` へ分離済み。`exportViewportPNG` は既に `_pgOk` 済み、選択由来エクスポートは選択自体が `_pgOk` 制約で安全。

## Decision
単一シーン (ページを表現できない) 出力のデフォルト入力を `_sh()` → **`_shV()`** (可視+現ページ) へ。対象:

- `exportExc` の `excScene(_shV())`
- `exportPNG`/`copyPNG`/`copySVG`/`exportSVG` の `shapes=_shV()` 既定引数
- `exportPDF` の bbox と描画ループ

全ページ書き出しが必要な場合は `.board` または `.drawio` を使う (それぞれページ構造を保持する唯一の往復フォーマット)。

## Consequences
- 複数ページのボードでも、見ているページがそのまま画像/SVG/excalidraw になる (WYSIWYG)
- 単一ページのボードでは従来と完全に同一の出力 (ページなし時 `_pgOk` は恒真)
- 選択スコープのエクスポートは無変更

## Tests
- 3ページ状態で `excScene` 相当のフィルタ出力が現ページのみ (behavioural)
- `excScene(_shV())` 呼出し・`shapes=_shV()` 既定引数4件のソースピン
