# ADR-0291: 開始ヘッドの ctx メニュー巡回

## 状態
承認 — round45

## 背景
ADR-0286 で導入した `s.startHead` (dot|open) は import のみで UI 未露出
だった。draw.io の "Line start" 相当を ctx メニューに追加。

## 決定
矢印選択時の ctx に「開始ヘッド」項目: なし→矢印→丸→シェブロンを巡回
(`s.start` で有無、`s.startHead` でスタイル)。'arrow' は明示 'arrow' を
書き込み (end が dot でも開始は矢印になるよう継承ではなく)。

## 断念した代替案
- 既存「両端ヘッド」トグル拡張 — 有無切替と語彙が異なるため別項目。

## 影響
`s.startHead` が UI から編集可能に。i18n ja/en 追加。1998 全緑。
