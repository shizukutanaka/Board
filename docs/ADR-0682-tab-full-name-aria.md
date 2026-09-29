# ADR-0682: ページタブ chip に完全名 aria-label

## Status
Accepted — round432

## Context
タブ chip の可視テキストは `_s0(p.name,12)` の切詰 — SR ユーザーには省略形が読み上げられ、長いページ名の区別がつかない (title は hover のみ、AT に届かない環境がある)。

## Decision
chip に `aria-label=p.name` — 可視は切詰のまま、AT には完全名。

## Tests
1 ピン: aria-label 行の存在
