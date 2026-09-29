# ADR-0670: ピアアバタークリックでそのピアのページへ追従

## Status
Accepted — round420

## Context
ADR-0656 でアバターのツールチップが「別ページに居るピア」を示すようになったが、追従手段がなかった — 自分でページバーを辿るしかない。コラボUXの定番 (Figma/Miro の follow) の最小形。

## Decision
アバター `onclick`: クリック時点の `p.pg` (live 参照) が自ページと異なり実在すれば `switchPage(p.pg)`。対象がある場合のみ `cursor:pointer`。

`switchPage` が既に `_ann` (SR announce) + カーソル hide + ジェスチャキャンセル (0664) を行うため、フォローの安全性は同機構に相乗り。

## Tests
- `switchPage(p.pg)` + pointer カーソルのピン (1 assert)
