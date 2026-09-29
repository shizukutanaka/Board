# ADR-0086: クリック単発でも box 図形をスタンプ

## 状態

実装済み (v1.7.144)。

## 背景

`endRectLike` は `w<2||h<2` (ドラッグなしの単発クリック) で
sticky→160²、frame→800×500 の既定サイズを配置するが、
rect/ellipse/diamond は `return` で何も生まれない。
draw.io/Figma ではクリックのみでも既定サイズの図形が置ける。

## 決定

- `endRectLike` の早期 return を、残りの box 型 (rect/ellipse/
  diamond) にも既定 120×80 でセンタリング配置に置き換える。
  サイズは既存の center-stamp 経路 (`{x:cx-60,y:cy-40,w:120,h:80}`)
  と同値で統一。

## 断念した代替案

- **160² で統一**: sticky は正方形が自然だが box 図形は横長が
  既定として使いやすい (コネクタ先の図形用途)。既存 120×80 と揃える。

## 影響

- rect/ellipse/diamond ツールでクリックのみで図形が配置され、
  select ツールへ自動復帰 + 選択状態になる (既存の配置後処理のまま)。
