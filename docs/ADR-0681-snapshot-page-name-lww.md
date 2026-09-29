# ADR-0681: snapshot union-heal の同 id ページ名を nts LWW でマージ

## Status
Accepted — round431

## Context
snapshot メッセージのページ union-heal は未知 id の append のみ — 同 id ページの name/nts はローカル値を保持。ピアが rename → op 未達 → snapshot が新名を運んでもローカルの古名が永久に残る (op は二度と来ない)。

## Decision
同 id ページに `(p.nts||0)>(l.nts||0)` で name+nts をマージ — `pageName` op (0646) と同一 LWW 規則。`_applySnapshot` (joiner 経路) の `_pgAdopt` 全置換はそのまま — 新規参加者にローカル名は存在しない。

## Tests
1 ピン: LWW マージ行の存在
