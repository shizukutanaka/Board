# ADR-0190: 付箋チェーンの全タイポグラフィ継承

## 状態

実装済み (v1.7.248)。

## 背景

`_stickyChain` (⌘Enter で右に続きの付箋を生成) は
color/fontSize/align のみを引き継いでいた — font/bold/italic/
under/strike/valign/lineH が失われ、「連鎖した付箋の見た目が
ばらける」(FigJam/Post-it® 式の高速連続メモで目立つ)。

## 決定

チェーン extras に全タイポグラフィを追加 (font/lineH/bold/
italic/under/strike/valign)。`Shape.make` の `Object.assign(base,
extras)` で extras が last-used 継承を上書きするため、ソースが
未設定のプロパティはチェーン側も未設定になる — 「複製」として
正しい動作。

## 断念した代替案

- **defined props のみ渡す**: undefined 明示で継承を打ち消す
  方が「ソースの複製」として正確。

## 影響

- チェーン付箋が親の完全な見た目を再現。既存の色/サイズ/揃え
  継承と整合。
