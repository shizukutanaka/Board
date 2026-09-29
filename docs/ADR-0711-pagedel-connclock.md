# ADR-0711 — pageDel backward connClears 復元の locked skip

## 状態
採用 (v1.7.737)

## 文脈
ADR-0707 で pageDel backward に `connClears` の `before` 復元を入れた際、
`del` backward が持つ `!sh.locked` ガードを欠いていた。del と undo の間に
コネクタがロックされた場合、undo がロック済み図形を書き換える (locked
parity 違反)。

## 変更
- pageDel backward の connClears 復元を `if(sh&&!sh.locked)` へ。
  remote `upd` forward も `sh.locked` で break するため、ピア側の
  undo-wire 適用も同じく skip され発散しない
