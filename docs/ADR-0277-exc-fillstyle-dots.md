# ADR-0277: excalidraw fillStyle dots → hatch 近似

## 状態
承認 — round40

## 背景
excalidraw の `fillStyle:'dots'` (ドット塗り) も Board に語彙がなく
無視されていた。zigzag と同じ近似方針で hatch にマップ。

## 決定
`st()` の fillStyle 分岐に `'dots'` を追加 → `o.fstyle='hatch'`。

## 断念した代替案
- dots 専用パターン — canvas 側に新塗りパターンを要し見合わない。

## 影響
dots 塗りが hatch として読み込める。1984 全緑。
