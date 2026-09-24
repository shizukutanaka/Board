# ADR-0161: スポイトツール (I)

## 状態

実装済み (v1.7.219)。

## 背景

図形のスタイルを採取するには ⌥C (style copy) → ⌥V (paste) の2段階が
必要だった。Figma の `I` (スポイト) は1操作で見た目を採る標準手段。

## 決定

- `I` キーで one-shot ツールへ (`pickTool('eyedropper',true)` で
  `_prevTool` を捕捉 — スペース・手のひらと同じ一時ツール機構)。
- クリックした図形 (ロック含む — 読み取りのみ) の見た目属性を
  `_styleOf()` で抽出し、`state.style` (新規図形の既定) と
  `styleClipboard` (⌥V で選択へ適用可) の両方へ格納。
- pick 後は前ツールへ自動復帰 (既定 `select`)。
- `copyStyle()` のインライン抽出を `_styleOf()` へ集約 (重複排除)。
- ツールバーボタンは設けずキーボード操作のみ (ヘルプに行追加)。

## 断念した代替案

- **⌥click ボディでスポイト**: ⌥+drag 複製 (ADR-0060) が pointerdown で
  即コミットするため click/drag を区別不能。Figma も ⌥click ではなく
  `I` ツール。
- **選択への直接適用**: Miro 式だが既存の ⌥V 適用経路と機能重複。
  既定スタイル + clipboard の両方に入れる方が用途をカバーする。

## 影響

- 新ツール `eyedropper` はシーンを変更しない (state.style/clipboard
  のみ) — undo 不要、リモート送信も発生しない。
