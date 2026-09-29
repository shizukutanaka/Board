# ADR-0633: architecture.md へ resize debounce / cancelNav を同期

- 状態: 実装済
- 日付: 2026-09-28

## 背景

ADR-0631 (resize 150ms debounce) と ADR-0632 (`Minimap.cancelNav` 経由
`_clearTouchState`) はいずれもライフサイクル系の不変条件を追加したが、
architecture.md の該当節に未反映だった — Input 節の
ジェスチャライフサイクル項 (blur/hidden/pagehide の掃除一覧) と
DPR 節 (`resize()` の発火契約) に同期が必要。

## 決定

- Input 節の `_clearTouchState` 記述へ `Minimap.cancelNav()` と
  `_mmNav` 残存の防止を明記。
- DPR 節へ resize が全バッキングストア再確保を伴うこと、3 リスナー
  (window/visualViewport/orientation) が `_resizeSoon` 経由である
  こと、`_watchDPR` は直接呼びであることを明記。

## 影響

ドキュメントのみ — コード差分なし。将来の掃除経路拡張 (新しい
gesture-scoped 状態を `_clearTouchState` に載せる等) の不変条件が
文書で追跡可能になる。
