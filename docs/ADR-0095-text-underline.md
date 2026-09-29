# ADR-0095: テキスト/付箋の下線 (⌘U)

## 状態

実装済み (v1.7.153)。

## 背景

`bold`/`italic` (ADR-0078) 済みだが `underline` がない — 見出し・
強調の定番装飾として抜けている (Excalidraw/Figma はいずれも搭載)。

## 決定

- `s.under` — `toggleTextFlag('under')` で `⌘U` トグル (style op、
  複数選択可、`bold`/`italic` と完全同型の経路)。
- canvas: `fillText` 直後に各行の `measureText` 幅で手動アンダー
  ライン (canvas に textDecoration は存在しない) — align 3種対応、
  `lineWidth=max(1,fs*0.06)`、sticky は clip 内で描画。
- SVG: `<text>` に `text-decoration="underline"` を付す
  (ブラウザが解釈するネイティブ機構)。
- 編集 overlay textarea: `textDecoration` 反映 — 編集中の見た目も一致。

## 断念した代替案

- **span 単位の部分装飾**: shape 単位の現在設計と非互換。保留。
- **box/edge ラベルへの適用**: bold/italic 同様 text/sticky 限定で
  統一 (ラベルは固定フォント仕様)。

## 影響

- `_fontStr` は不変 (underline はフォント記述子に含まれない)。
- ヘルプ行を `⌘B / ⌘I / ⌘U` に更新。
