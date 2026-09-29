# ADR-0673: ページタブストリップ (直接ジャンプ)

## Status
Accepted — round423

## Context
ページナビは ‹/› の逐次ステップのみ — drawio import 等でページが増えると目的ページまで最大 63 クリック (cap 64)。drawio/Miro 標準のタブストリップへ。

## Decision
`#pgTabs` を pgBar に追加し `_pgBar` が全ページ chip を再構築 (≤64、安い):
- chip クリック → `switchPage` (別ページ)
- アクティブ chip クリック → `_pgRename` (改名を1クリック圏内に維持)
- 表示名は先頭12文字、title にフル名、横スクロール (`max-width:38vw`)

`pgName` ボタンは ✎ glyph に (改名 affordance を明示)。‹/› と PgUp/PgDn は逐次ナビとして残置。

## Tests
2 ピン: chip ハンドラ + アクティブスタイル
