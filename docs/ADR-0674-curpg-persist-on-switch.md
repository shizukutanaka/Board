# ADR-0674: ページ切替で Persist.schedule

## Status
Accepted — round424

## Context
`curPg` は doc record に含まれるが、`switchPage` が `_ps()` を呼ばない — ページ切替のみのセッション (編集なし) では record が古いまま、リロードで `pages[0]` に戻る。`_setDocName`+`_ps()` (ADR-0402) と同じ先行例に揃える。

## Decision
`switchPage` 末尾に `_ps()` — debounce 500ms 済みの既存 schedule を再利用、連続切替でも書込みは1回にまとまる。`_pgAdopt` 経路 (restore/import) は既に `_ps()` するため対象外。

## Tests
1 ピン: `_pgBar();_ps()` の存在
