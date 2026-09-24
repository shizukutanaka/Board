# ADR-0272: クリップボード image/svg+xml → ベクターインポート

## 状態
承認 — round40

## 背景
draw.io や Figma からのコピーはクリップボードに `image/svg+xml` MIME を
置く。従来は `image/*` ブランチで dataURL ラスター化され、図形としての
編集性を失っていた (text/plain にも SVG が並存するが、image アイテム
存在時はそちらが優先されていた)。

## 決定
paste ハンドラの冒頭で `image/svg+xml` アイテムを検出し、
`getAsFile().text()` → `importSvgText` へ誘導。SVG アイテムが無い
場合は従来経路のまま。

## 断念した代替案
- `items` フィルタから svg を除外して text/plain 経路に落とす — 他の
  image アイテムと併存した場合の経路が不安定になるため、先頭で明示的に
  判定する方式を採用。

## 影響
外部ツールからの SVG コピーがベクター図形として取り込まれる。
1979 全緑。
