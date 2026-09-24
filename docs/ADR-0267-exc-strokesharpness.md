# ADR-0267: excalidraw strokeSharpness ↔ s.r 往復

## 状態
承認 — round39

## 背景
excalidraw は `roundness` を旧表現とし、現行の角丸指定は
`strokeSharpness:'round'|'sharp'`。旧フィールドのみ読み/書きしていた
ため、現行ファイルの角丸が取り込めなかった。

## 決定
- import: `e.roundness || e.strokeSharpness==='round'` → `s.r=8`
  (旧・現行双方を受理)。
- export: `strokeSharpness:s.r?'round':'sharp'` を rect/ellipse/diamond
  に追加 (従来の `roundness` も併記 — 旧リーダー向け)。

## 断念した代替案
- roundness 出力の廃止 — 旧バージョンの excalidraw が読めなくなる。

## 影響
現行 excalidraw ファイルの角丸を保持。1973 全緑。
