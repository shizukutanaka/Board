# ADR-0298: フレームラベルの fontSize を s.fontSize に従わせる

## 状態
承認 — round48

## 背景
frame ラベルは `fs=12` / `_svgFont(s,12)` に固定されており、
`state.style.fontSize` も `⌘⇧.` の fontSizeStep も frame に適用
されなかった (font-family は ADR-0188 で既に流用)。

## 決定
canvas `const fs=s.fontSize||12`、SVG `_svgFont(s,s.fontSize||12)`、
fontSizeStep の gate に `s.type!=='frame'` を追加 — frame も
⌘⇧,/. でラベルサイズ変更可能に。

## 断念した代替案
- frame 専用 fontSize プロパティ — 既存の s.fontSize と不変性が同じ
  で重複のみ。

## 影響
frame ラベルのサイズが style op + ⌘⇧キーで変更可能、SVG export
も一致。2005 全緑。
