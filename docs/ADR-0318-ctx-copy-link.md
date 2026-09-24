# ADR-0318: ctx「リンクをコピー」

## 状態
承認 — round52

## 背景
`s.link` の ctx 操作は設定/開くの2件のみで、Figma の
「Copy link to object」相当 (リンク URL を他文書・チャットへ
貼り付けたい) がなかった。

## 決定
ctx に `['ctxCopyLink','',…]` を追加 — `s.link` 保持図形選択時のみ
表示、`copyText` でクリップボードへ (既存の copied/copyFailed
トースト経路を再利用)。

## 断念した代替案
- setSelLink プロンプト内にコピーボタン — prompt() は
  ネイティブで拡張不可のため ctx 項目として独立させた。

## 影響
リンクの再配布が1アクションに。2026 全緑。
