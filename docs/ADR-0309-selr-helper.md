# ADR-0309: origSel 復元を `_selR(op)` に集約

## 状態
承認 — round50

## 背景
`_apply` 各分岐の selection 復元
`if(op.origSel)state.selection=new Set(op.origSel.filter(id=>byId(id)))`
が 11 箇所に散在。

## 決定
`const _selR=op=>{if(op.origSel)state.selection=new Set(op.origSel.filter(id=>byId(id)))}`
を globals に追加し、`if(op.origSel)…` → `_selR(op)`、
`if(!forward&&op.origSel)…` → `if(!forward)_selR(op)` に置換。

## 断念した代替案
- _apply 全体の構造化 — case 毎の副作用が異なり、復元部分のみの
  切り出しが最小変更。

## 影響
raw ~550B。2016 全緑。
