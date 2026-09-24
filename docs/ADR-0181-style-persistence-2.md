# ADR-0181: head/font の last-used 継承

## 状態

実装済み (v1.7.239)。

## 背景

ADR-0180 で fontSize の last-used 継承を入れたが、同じ規則が
`head` (矢印ヘッドスタイル) と `font` (書体) には未適用だった。
矢印を毎回「dot」に変え直す・書体を毎回等幅に戻す手間は
draw.io/Figma ユーザーに馴染みのない摩擦。

## 決定

- `Shape.make` が型別に `state.style.head`/`state.style.font` を
  引き継ぐ — `type==='arrow'` → `head`、`text/sticky` → `font`
  (設定済みの場合のみ)。
- `cycleArrowHead`/`cycleFont` が適用値を `state.style` に記録
  (ADR-0180 の fontSize と同一パターン)。

## 断念した代替案

- **全プロパティ一律継承**: `align`/`valign`/`bold` などの
  「意味を変える」プロパティは新規図形に継承させると意外性が
  ある — 無害な見た目プロパティに限定。

## 影響

- 未設定 (`null`) の場合は従来既定。`state.style` に追加された
  キーはスタイルパネル同期対象外 (パネルは stroke/fill/dash/
  size/opacity のみ管理)。
