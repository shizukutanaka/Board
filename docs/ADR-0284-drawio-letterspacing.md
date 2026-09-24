# ADR-0284: drawio letterSpacing ↔ s.spacing 往復

## 状態
承認 — round42

## 背景
Board の `s.spacing` (ADR-0205 字間) は drawio ネイティブの
`letterSpacing` 属性と同じ語彙だが往復未実装だった。

## 決定
- `_dioStyEmit`: `s.spacing` → `letterSpacing=N` (vertex/edge 共通)。
- `_dioStyApply`: `sty.letterSpacing` → `s.spacing` (40 clamp)。
併せて ADR-0283 の stop-color を `style="stop-color:…"` 属性内からも
解決するフォールバックを追加 (Illustrator 系の出力で多い)。

## 断念した代替案
- excalidraw 側にも同値を出す — excalidraw に letterSpacing 語彙なし。

## 影響
字間が drawio 往復で保持。1991 全緑。
