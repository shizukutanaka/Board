# ADR-0296: excalidraw binding.focus → aF/bF 輸入

## 状態
承認 — round47

## 背景
excalidraw `startBinding.focus`/`endBinding.focus` (辺上の接続位置
-1..1) は export では `s.aF.fx*2-1` として emit 済みだが import で
elementId しか見ていなかった。

## 決定
`focus` → `s.aF={fx:_c01((focus+1)/2),fy:0.5}` (bF 同様) — 辺中心基準
の近似 (aF の fy は辺中心の 0.5)。

## 断念した代替案
- focus→vy マッピング (縦辺の fy) — 辺の向き不定のため近似を採用。

## 影響
excalidraw の固定アンカー位置が往復。2003 全緑。
