# ADR-0246: drawio `shadow=1` ↔ `s.shadow`

## 状態
承認 — round36

## 背景
drawio の `shadow=1` スタイルキーは Board の `s.shadow` (canvas shadowBlur +
SVG feDropShadow、ADR-0194/0211) に相当するが、両方向未対応だった。

## 決定
- export: vertex/edge の sty に `if(s.shadow)sty+='shadow=1;'`。
- import: `sty.shadow==='1'` → `s.shadow=1`、vertex/edge 双方。

## 断念した代替案
- `shadow=1` 以外の値 (sketch/shadowOpacity) — Board は on/off のみ。

## 影響
ドロップシャドウが .drawio と往復する。1957 全緑。
