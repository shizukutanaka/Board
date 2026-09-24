# ADR-0352: .drawio 画像ラベル ↔ `s.cap` 往復

## 状態
承認 — round80

## 背景
2方向の実ギャップ:
- emit: 画像の `s.cap` が `value` に載らず消失。
- import: drawio 画像ラベルが `s.label` に入るが、Board の画像は
  label を描画しない (cap のみ) — 取り込んだラベルが不可視化。

## 決定
- emit: image vertex の `value` を `s.cap||s.label||s.text`、
  `verticalAlign=bottom` で帯位置を drawio 側に近似的に再現。
- import: `shape=image` の `lbl` を `s.label` ではなく `s.cap` に
  マップ — Board で実際に見える唯一の画像文字プロパティへ。

## 影響
+~150B (522,972B)。画像ラベルが Board↔drawio で可視を保つ。
2044 全緑。
