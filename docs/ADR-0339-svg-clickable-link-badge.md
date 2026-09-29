# ADR-0339: SVG 書き出しの 🔗 バッジをクリッカブル `<a>` 化

## 状態
承認 — round68

## 背景
`s.link` は canvas (ADR-0310/0333) と SVG export (ADR-0316/0333) に
🔗 バッジを出すが、SVG 側は非クリッカブルな装飾だった。
draw.io / Excalidraw の SVG 書き出しはリンクを `<a href>` で包む。

## 決定
SVG の3バッジ部位 (box 右上 / conn ラベル脇 / pen 先端) を
`<a href="${esc(s.link)}" target="_blank" rel="noopener">` で包む。
`esc()` で属性エスケープ、`validPatch` が既に http(s) のみ許可
(ADR-0327) のため XSS 面は既に塞がれている。

## 影響
+~200B (522,783B)。SVG をブラウザで開いた際リンク遷移可能に。
