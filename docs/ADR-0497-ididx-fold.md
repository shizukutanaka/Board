# ADR-0497: `_idIdx` — id での図形 index 検索の集約

## 状態

実装済 (v1.7.530)

## 背景

`_sh().findIndex(s=>s.id===X.id)` (id による index 検索 → splice) が undo/del/
addMany/eraser の 4 サイトに複写。

## 決定

`_idIdx=id=>_sh().findIndex(s=>s.id===id)` に集約 — 「配列上の index を id で
引く」操作を語彙化。size は微増だが splice-by-id パターンの記述統一として採用。

## 影響

- index.html +15B (def コストを差し引いた net)
- 動作変更なし
