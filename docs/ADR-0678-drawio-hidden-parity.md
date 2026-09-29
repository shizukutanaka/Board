# ADR-0678: .drawio エクスポートの hidden parity

## Status
Accepted — round428

## Context
`.excalidraw` は 0594 で hidden 図形を除外済みだが、`.drawio` は `_sh()` 全図形 (hidden 含む) を書き出していた。drawio に visibility 概念は無いため、隠した図形がファイル上では可視で現れ、再取込では永久に可視化する片方向リーク。

## Decision
`exportDrawio` の既定引数を `_sh().filter(_sv)`、per-page filter にも `_sv(s)` — excalidraw と同一規則。明示配列 (選択エクスポート `exportDrawio(sel)`) はフィルタしない — 選択不変条件で可視済み。

## Tests
2 ピン: doc 既定引数 + per-page フィルタ双方の `_sv` ゲート
