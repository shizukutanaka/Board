# ADR-0690: _pgAdopt のページ交代でも cursorHide を送る

## Status
Accepted — round440

## Context
0689 で `switchPage` の送出順を正したが、ページセット丸ごと adopt (snapshot/wholesale) で `curPg` が動く経路は cursorHide を送っていなかった — ピア側のカーソル/アバターページが旧ページに残存。

## Decision
`nc!==oc` の時だけ `Net.sendCursorHide()` (代入後 — 0690 の pg は新ページを指す)。

## Tests
2 ピン: gesture/editor キャンセルゲート (oc 形追従) + cursorHide 送出
