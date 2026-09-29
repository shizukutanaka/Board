# ADR-0241: excalidraw `locked` の往復

## 状態
承認 — round36

## 背景
Board の `s.locked` は export 時に `locked:false` 固定で捨てられ、import 時も
`e.locked` を読んでいなかった。excalidraw との間でロック状態が一方的に失われる。

## 決定
- export: `E()` の `locked:false` を `locked:!!s.locked` へ。
- import: 要素取込の終端で `if(e.locked)s.locked=1`。
- `_ct` (コンテナ用テキスト) は合成要素のため `locked:false` のまま —
  インポート側で親へ折り畳まれ、実体を持たない。

## 断念した代替案
- コンテナテキストにも locked を伝播 — 折り畳みで消えるため意味を持たない。

## 影響
.excalidraw との間でロックが完全に往復する。1956 全緑。
