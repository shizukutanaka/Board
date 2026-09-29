# ADR-0669: ステータスバー図形カウントを閲覧ページへ

## Status
Accepted — round419

## Context
`sCount` が `_nS()` (全盤面合計) — ページ2で「shapes: 500」と表示されても閲覧中ページには1つも図形がないという矛盾表示。

## Decision
`_sh().filter(_pgOk).length` — 閲覧ページのメンバー数 (非表示図形もカウント: ページに存在するかの統計であり、描画可視性とは別軸)。

## Audit 締め
この round で `_sh()` 全走査系の監査が完走 — 残るグローバルサイトは設計通り:
- Store op 適用 (add/del/replace/snapshot) — 帰属は op ペイロードが保持
- 結合コネクタ掃引 — 端点追従は幾何不変条件でページ横断
- z-order/frac/Grid ビルド — グローバル z 空間
- `.board`/`.excalidraw`/`.drawio` エクスポート — ページ同梱の全ドキュメント形式

## Tests
- `_pgOk` カウントへのピン (1 assert)
