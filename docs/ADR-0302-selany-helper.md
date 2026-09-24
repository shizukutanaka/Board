# ADR-0302: ctx ゲートの selection.some を `_selAny` に集約

## 状態
承認 — round49

## 背景
ctx メニューの表示ゲート
`[...state.selection].some(id=>{const s=byId(id);return s&&X})`
が 29 箇所に散在し、各 80B 超の定形記述が繰り返されていた。

## 決定
`const _selAny=f=>[...state.selection].some(id=>{const s=byId(id);return s&&f(s)})`
を globals に追加し、全サイトを `_selAny(s=>X)` に一括置換。

## 断念した代替案
- `_forSel` (apply 側の for ループ集約) — before/after 記述が
  サイト固有で読みにくくなるため今回はゲート側のみ。

## 影響
raw -1,295B。2009 全緑。
