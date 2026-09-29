# ADR-0768: プレゼン中の PgDn/PgUp をスライドナビへ

## 状態
採用 — 実装済

## 背景

プレゼンテーションモードは `_pA()` ガードで矢印/space/Esc 以外の全キーを呑む
(ADR-0640)。マルチページ導入 (ADR-0646) で PgDn/PgUp は「ページ巡回」に割当て
られたが (ADR-0648)、プレゼン中は `!meta` ページナビハンドラまで到達せず
沈黙していた。

Keynote / PowerPoint / Google Slides の全てで Page Down/Page Up は
スライド送り/戻し。呑まれる挙動は「壊れている」と読まれる。

## 決定

`_pA()` ナビキー集合に `pagedown`/`pageup` を追加し `Presentation.next()`/
`prev()` へ割当てる。通常モードの `!meta` PgDn/PgUp ページ巡回は不変 —
両経路はプレゼン活性フラグで排他。

## 影響

- プレゼン中 PgDn → 次スライド、PgUp → 前スライド (端では既存の clamp)
- 通常モードのページ巡回キーに変更なし
- 系列テストに最終スライドでの clamp + 戻りナビのピン追加
