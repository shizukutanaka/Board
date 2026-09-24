# ADR-0114: 選択のみ .board 書き出し

## 状態

実装済み (v1.7.171)。

## 背景

選択のみの書き出しは PNG/SVG/クリップボード (ADR-0052/0087) が
あるが、ネイティブ形式の .board は全面のみ — 盤面の一部だけを
別ボードへ持ち出す手段が無い。

## 決定

- `exportBoard(shapes=state.shapes)` に shapes 引数を追加
  (PNG/SVG と同じ ADR-0052 パターン)。
- `exportSelection` に `fmt==='board'` 分岐と ctx
  `ctxExportSelBoard` を追加。

## 断念した代替案

- **エクスポートメニューに常設**: 選択が無いと無意味 — 既存の
  選択書き出し行 (ctxExportSelPNG 等) と同じ ctx セクションに置く。

## 影響

- 書き出し形式は全面版と同一 (`{v,docName,shapes}`) — importBoard
  でそのまま読める。
