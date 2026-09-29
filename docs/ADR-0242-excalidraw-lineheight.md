# ADR-0242: excalidraw `lineHeight` ↔ `s.lineH`

## 状態
承認 — round36

## 背景
どちらの形式も line-height を倍率 (既定 ~1.25) で持つが、export は `1.25`
固定、import は未読だった。

## 決定
- export: `_ct` と standalone text の `lineHeight:1.25` を `s.lineH||1.25` へ。
- import: `st()` で `e.lineHeight` (有限数かつ既定値と異なる場合) を
  `o.lineH` へ — 0.5..4 にクランプ。非テキスト形状に付いても描画は無害
  (lineH はテキスト系のみ参照)。

## 断念した代替案
- テキスト要素のみ適用 — st() 集約の方が一貫;非テキストへの副作用なし。

## 影響
行間が excalidraw と往復する。1956 全緑。
