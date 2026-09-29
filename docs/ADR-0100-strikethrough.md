# ADR-0100: テキスト/付箋の取り消し線 (⌘⇧X)

## 状態

実装済み (v1.7.158)。

## 背景

bold/italic/underline に続く最後の基本装飾 — TODO・修正指示で
頻出。ADR-0095 の手動ライン機構をそのまま流用できる。

## 決定

- `s.strike` — `toggleTextFlag('strike')` で `⌘⇧X` トグル (style op)。
- canvas: 各行 `fs*0.55` 高に中央ライン (underline と共存、同じ
  measureText 幅/align ロジック)。
- SVG: `text-decoration` を `[underline,line-through]` の連結生成に
  一般化 — 両方掛かった時 `"underline line-through"` を出す。
- 編集 overlay も `textDecoration` 連結で一致。

## 断念した代替案

- **`⌘⇧S` への割当**: exportBoard と衝突 — ⌘⇧X はアプリ/OS で空き。

## 影響

- bold/italic/underline/strike の4装飾が完結。
- ヘルプ行を `⌘B / ⌘I / ⌘U / ⌘⇧X` に更新。
