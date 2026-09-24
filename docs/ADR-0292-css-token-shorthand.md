# ADR-0292: getCSS トークンの短縮 helper (raw -350B)

## 状態
承認 — round46

## 背景
`getCSS('--paper')` (16箇所) と `getCSS('--accent-contrast')` (11箇所)
のリテラル呼び出しが散在。

## 決定
`const _p=()=>getCSS('--paper'),_ac=()=>getCSS('--accent-contrast')`
を追加し全箇所を `_p()`/`_ac()` に。

## 断念した代替案
- `_p` を値キャッシュ (文字列) — getCSS 自体が _cssCache 済みのため
  呼び出し形で十分。

## 影響
index.html -355B (523,273B)。1999 全緑 (UI-indicator count assert を
`_ac()` 数に更新)。
