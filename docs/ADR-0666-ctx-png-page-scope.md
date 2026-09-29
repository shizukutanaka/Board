# ADR-0666: ctx PNG 1x/4x エクスポートも閲覧ページへスコープ

## Status
Accepted — round416

## Context
ADR-0658 で単一シーン系エクスポートの既定引数を `_shV()` (可視+閲覧ページ) にしたが、export メニューの固定スケール項目は明示引数 `exportPNG(_sh(),1|4)` を残していた → **全ページの図形が同一座標で重畳**される (0658 の残穴、⌘E 既定と挙動が矛盾)。

## Decision
ctx メニューの両項目を `_shV()` へ変更 — 既定と同じページスコープ。

`.board`/`.excalidraw`/`.drawio` はページ集合を同梱する全ドキュメント形式のため `_sh()` 維持 (設計通り)。

## Tests
- `exportPNG(_sh(),1|4)` 残サイトゼロ + `_shV()` 化のピン (2 asserts)
