# ADR-0248: `_rcOp`/`_cOp` — commit+origSel イディオムの集約

## 状態
承認 — round37

## 背景
`const origSel=[...state.selection];` → `Store.commit|_recordCommitted(op)` →
`if(origSel.length)state.history[state.histIdx].origSel=origSel;` の3行
イディオムが **37箇所**に展開していた (ADR-0239 の `_styleOp` 内包分を除く)。
512KB raw ceiling への余地を回収するため集約した。

## 決定
```
function _rcOp(op){const o=[...state.selection];Store._recordCommitted(op);
  if(o.length)state.history[state.histIdx].origSel=o}
function _cOp(op){const o=[...state.selection];Store.commit(op);
  if(o.length)state.history[state.histIdx].origSel=o}
```
37サイト + `_sfbFlush` の同一行イディオム (→`_styleOp`) + 4175行の
同一行イディオム (→`_rcOp`) を書き換え、`_styleOp` は `_rcOp` へ委譲。
約 3.5KB 回収 (522,968→518,5xx)。

## 断念した代替案
- 途中に別文のある origSel サイト (capture→selection.clear→commit 等)
  は意味が違うため据置き。
- `op` への副作用なしを確認済み (両ヘルパーとも op を変更しない)。

## 影響
undo の origSel 復元経路は不変。1959 全緑。
