# ADR-0308: `const sel=[...].map(byId).filter(f)` を `_selL(f)` に集約

## 状態
承認 — round50

## 背景
コマンド冒頭の
`const sel=[...state.selection].map(byId).filter(f)`
が 18 箇所に散在。

## 決定
`const _selL=f=>[...state.selection].map(byId).filter(f)` を
globals に追加し全サイト `const sel=_selL(f)` に置換。

## 断念した代替案
- `_selAny`/`_forSel` との統合 — リストが後続で使われる点が異なり
  別ヘルパーが明快。

## 影響
raw ~500B。2015 全緑。
