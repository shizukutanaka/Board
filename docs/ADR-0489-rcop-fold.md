# ADR-0489: `_rcOp` fold — 残直書き `_recordCommitted + _keepSel` の集約

## 状態

実装済 (v1.7.522)

## 背景

`_rcOp(op)` (commit + `_keepSel`) は既存だが、同じ形を手書きしていた
`_recordCommitted(...); _keepSel(origSel);` が 3 箇所残っていた:

- `_endDrag` の way style op
- `doGroup`
- `frameFit` (if-guard 内の複文)

`_rcOp` は commit 直前に `_selIds()` を再捕捉するため、op 内の
`origSel` フィールドに詰める以外の `_keepSel` 目的と等価。

## 決定

上記 3 サイトを `_rcOp({...})` に置き換え。`doUngroup` は `_ss` で選択を
拡張した後の commit のため origSel≠_selIds() — 非対象。`doBeautify`・
`replace` 系は op 内に `origSel` フィールドを保持 (undo 復元用途) — 非対象。

## 影響

- index.html −205B (523,436 → 523,231)
- 動作変更なし (捕捉タイミング等価 — commit 直前の _selIds は同一値)
