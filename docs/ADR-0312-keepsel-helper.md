# ADR-0312: origSel 書き戻しを `_keepSel(arr)` に集約

## 状態
承認 — round51

## 背景
op 記録後の selection 保存
`if(origSel.length)state.history[state.histIdx].origSel=origSel;`
が 15 箇所に散在 (ADR-0309 `_selR` の対になる記録側定型)。

## 決定
`const _keepSel=arr=>{if(arr.length)state.history[state.histIdx].origSel=arr}`
を globals に追加し全サイトに置換。

## 断念した代替案
- `Store._recordCommitted` に吸収 — op によっては commit が別経路
  (Store.commit/直接 push) で hook 挿入点が不統一のため個別呼出を維持。

## 影響
raw ~525B。2019 全緑。
