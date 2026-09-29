# ADR-0074: ボックスラベルの折返し表示

## 状態

採用 (v1.7.132)

## 背景

rect/ellipse/diamond の `s.label` は `_drawBoxLabel` が1行の fillText で
中央描画するのみ — 長いラベルは図形幅からはみ出し、`\n` も無視される
(エディタは複数行入力可)。draw.io/Excalidraw ではラベルは図形内で
折り返される。

## 決定

- `_drawBoxLabel` を `wrapTextCached` (付箋と同じ禁則処理付き折返し) で
  `w-8` に wrap し、行群を中央揃え (行間 1.25×) で描画。
- SVG export の rect/ellipse/diamond ラベルも同幅で wrap し、行ごとの
  `<tspan>` を中央揃えで出力 (表示=出力パリティ)。
- コネクタラベル・フレームラベルは対象外 (位置が意味を持つ)。
- op・モデルは不変 — `s.label` の意味は単に表示が折返されるのみ。

## 断念した代替案

- **図形の自動伸長**: ラベルに合わせて w/h を伸ばす — op 連鎖 (resive が
  label commit に反応) が循環し得るため見送り。
- **省略 (ellipsis)**: 情報欠落 — scratchpad の図形ラベルは全文表示が正義。
- **縮小フォントで幅合わせ**: 可読性悪化・不統一。

## 影響

- 長いラベルが図形内に収まるようになる (見た目改善、フロー図で効果大)。
- `_wrapCache` を label 用に再利用 (key に text 含有で安全)。
