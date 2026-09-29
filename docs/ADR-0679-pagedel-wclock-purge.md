# ADR-0679: pageDel がメンバーの wclock を削除

## Status
Accepted — round429

## Context
`del` は削除時に `delete _wc()[sh.id]` するが、`_pgDel2` (pageDel の member 除去経路) は filter のみ — 死んだ図形の per-property write-clock が残留。復活した同 id 図形 (undo/snapshot 復元) が前世代の clock と仲裁する余地。

## Decision
filter 前に `(s.pg||firstId)===op.id` のメンバーへ `delete _wc()[s.id]` — `del` と同一衛生規則。`_pcC` が per-shape cache を全掃除するが `_wc` は Store の LWW 台帳なので別途明示的に。

## Tests
1 ピン: purge 行の存在
