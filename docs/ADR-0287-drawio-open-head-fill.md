# ADR-0287: drawio `endFill=0` → open ヘッド輸入

## 状態
承認 — round43

## 背景
drawio の未塗り矢印は `endArrow=open` と
`endArrow=classic;endFill=0` の2表記がある (UML で多用)。
後者は従来塗りつぶし classic として誤描画された。

## 決定
import で `endFill=0` (かつ endArrow あり・dot でない) → `s.head='open'`、
`startFill=0` → `s.startHead='open'`。export は既存の open 表記を継続。

## 断念した代替案
- export で endFill=0 表記も出す — 冗長表現を増やす必要なし。

## 影響
UML 白抜き矢印が正しく import。1993 全緑。
