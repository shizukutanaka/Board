# ADR-0169: ラベルのフォントサイズ

## 状態

実装済み (v1.7.227)。

## 背景

コネクタラベルは 12px、ボックス/画像キャプションラベルは 14px で
固定 — ⌘⇧,/⌘⇧. (fontSizeStep) は text/sticky のみ対象で、ラベルを
持つ図形はサイズ変更できなかった。draw.io はラベル文字を普通に
サイズ変更できる。

## 決定

- `fontSizeStep` の型ゲートを `s.label` 保持図形へ拡張
  (rect/ellipse/diamond/frame/line/arrow/image が対象に)。
- `_drawConnLabel`/`_connLabelSVG` は `s.fontSize||12`、
  `_drawBoxLabel`/`_svgBoxLabel`/`_drawImgLabel`/`_svgImgLabel` は
  `s.fontSize||14` — 既定値維持で非設定図形の見た目不変。
- ピル背景/ラップ/行高は fs 連動で再計算 (canvas/SVG 一致)。

## 断念した代替案

- **ラベル専用の別プロパティ**: `fontSize` 一本が設定モデルとして
  簡潔 (sticky/text と同一プロパティ、validPatch/styleClipboard で
  既に流通)。

## 影響

- style op 経由で undo/sync 適合。未設定図形は従来通りの見た目。
