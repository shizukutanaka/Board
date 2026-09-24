# ADR-0170: ラベルの太字・斜体・下線・取消線

## 状態

実装済み (v1.7.228)。

## 背景

ADR-0169 で fontSize をラベルに適用したが、bold/italic/under/strike
は依然 text/sticky 専用 — ラベル (コネクタ・ボックス・画像
キャプション) は固定フォントで、⌘B/⌘I/⌘U/⌘⇧X が効かなかった。

## 決定

- `toggleTextFlag` の型ゲートを `s.label` 保持図形へ拡張 —
  ラベルを持つ全型で4フラグを切替可能。
- `_drawConnLabel`/`_drawBoxLabel`/`_drawImgLabel` は `_fontStr`
  経由へ (sticky/text と同じ斜体・太字合成)。canvas の下線/取消線は
  測定幅で手動ストローク (sticky パターンを踏襲)。
- `_connLabelSVG`/`_svgBoxLabel`/`_svgImgLabel` は
  `font-weight`/`font-style`/`text-decoration` 属性を同条件で emit。
- 画像キャプションは帯内クリップ済みのため under/strike ストローク
  は描画省略 (SVG 側の text-decoration で表現済み、canvas は
  帯の高さ制約で視覚差小)。

## 断念した代替案

- **ctx メニューへのラベル装飾ボタン**: 既存ショートカットの
  ゲート拡張で十分、ctx は既に過密。

## 影響

- style op 経由で undo/sync 適合。`bold`/`italic`/`under`/`strike`
  は validPatch 通過済みでリモート・ファイル両経路に流れる。
