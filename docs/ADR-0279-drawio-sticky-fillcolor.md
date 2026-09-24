# ADR-0279: drawio sticky の fillColor ↔ s.color 往復

## 状態
承認 — round41

## 背景
sticky は `shape=note` で export するが、紙色 `s.color` を書き出して
いなかった (import 側は `sty.fillColor`→`s.color` を既に読む)。
`fontColor` (文字色) のみ出ていて紙色が往復しなかった。

## 決定
vertex export で `t==='sticky' && !s.fill` 時に
`fillColor=<s.color||default>` を追加 (fill がある場合はそちらを優先し
二重発行を回避)。

## 断念した代替案
- `fillColor` を無条件発行 — s.fill 併存時に二重キーとなるため回避。

## 影響
付箋の紙色が drawio 往復で保持。1986 全緑。
