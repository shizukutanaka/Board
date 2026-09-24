# ADR-0087: 選択領域の SVG をクリップボードへコピー

## 状態

実装済み (v1.7.145)。

## 背景

選択領域の ctx メニューは PNG 書き出し・PNG コピー・SVG 書き出しを
持つが、SVG **コピー**だけ無い。SVG をドキュメントや他ツールへ
ペーストする際に、一旦ファイルへ書き出してから開く手間が要る。
`copyPNG` と対の機能。

## 決定

- `copySVG(shapes=state.shapes)`: `buildSVG` で選択/盤面の SVG を
  生成し `copyText` (secure-context writeText + textarea フォールバック)
  でクリップボードへ。空盤面は exportSVG と同じ 'empty' 警告。
- `exportSelection(fmt)` に `'svgcopy'` を追加し、canvas ctx に
  `ctxCopySelSVG` を1行追加 (PNG コピーと同じ構造)。

## 断念した代替案

- **`navigator.clipboard.write` で image/svg+xml**: ClipboardItem の
  SVG MIME サポートはブラウザ差が大きく、text コピーの方が確実。
  受け手は SVG ソースを直接使う用途が多い。

## 影響

- `buildSVG` の再利用のみ — 新規描画経路なし。
