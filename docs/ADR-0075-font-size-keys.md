# ADR-0075: フォントサイズのキーボード増減 (⌘⇧, / ⌘⇧.)

## 状態

採用 (v1.7.133)

## 背景

text/sticky の fontSize 変更はスタイルパネルのみ — キーボードのみの
高速調整ができない (Figma/draw.io は ⌘⇧< / ⌘⇧> をサポート)。

## 決定

- `fontSizeStep(d)`: 選択中の text/sticky の `fontSize` を ±2 (8–64 に
  clamp) し `style` op で commit — undo/LWW 同期は既存経路。
- キーバインド: `meta+shift` + `,`/`.` (US 配列では ⇧, = `<`、⇧. = `>`
  — 両方を受理)。
- help grid に行追加。

## 断念した代替案

- **スタイルパネルに ± ボタン**: パネルは既に fontSize 入力がある —
  キーボード経路は別物として補完。
- **スムース連続スケール**: キー単位の ±2 step で十分 (scroll-wheel での
  連続変化は誤爆が多い)。

## 影響

- INPUT 1 エントリ + 補助関数1 + help 行 — op・モデル不変。
