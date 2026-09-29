# ADR-0683: pgBar sig セパレータ + フォーカス復元

## Status
Accepted — round433

## Context
1. `_pgSig` が `id+''+name` の無セパレータ結合 — `('p1','12')` と `('p11','2')` が同一 sig となり、remote rename が衝突して chip 再構築をスキップ (0675 の sig 衝突穴)。
2. リモート pageAdd/Del/rename で sig 変化 → chip 再構築 → Tab 移動中のフォーカスが body へ落ちる。

## Decision
- sig を `id+'\x1f'+name` (unit separator) へ — id/name 境界の衝突を不可能化。
- 再構築前に `activeElement._pgid` を記録し、再構築後に同ページ chip へ `focus()` 復元 (chip が消えていれば自然に body へ)。

## Tests
3 ピン: セパレータ `_fid` 記録/復元
