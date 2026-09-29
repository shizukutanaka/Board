# ADR-0091: 検索結果の全選択 (⌘Enter in search)

## 状態

実装済み (v1.7.149)。

## 背景

⌘F 検索は Enter/⇧Enter でマッチを順送りするのみ — 「全部まとめて
選択して一括移動/スタイル変更」ができない。draw.io の検索結果
pane にある全選択相当。

## 決定

- 検索入力で `⌘Enter` (meta+Enter): `_sqMatches()` の全件を
  `state.selection` にセット、`_announceSel` で SR 通知、件数トースト
  (`selAllMatches`)。確定後は検索ボックスを閉じる (選択という終端
  アクションなので overlay ハイライトも畳む)。

## 断念した代替案

- **ボックスを開いたままにする**: 選択後も検索 UI が残ると次の操作
  (移動/スタイル) の邪魔。閉じる方が一貫。

## 影響

- マッチ0件は no-op (toast なし)。
- 既存 Enter/⇧Enter/Escape の動作は不変。
