# ADR-0938: docName の自側 writer 刻印 — 同 ts 改名競合の発散解消

Status: implemented (v1.7.964)
Date: 2026-10-01

## Context

ADR-0699 で docName 改名は `(ts, writer)` 全順序 `_nameWin` で収束する。
受信側は `msg.peer` (=エンベロープの `_pi()`) を `_namePeer` に刻印するが、
**送出側の `_bName` は `_nameTs` のみ刻み `_namePeer` を自分の peerId に
刻まなかった**。ローカル改名後の自側キーは `{ts, ''}` (または古い他ピア値)
のまま残る。

## Defect

A,B が同 ts T で並行改名した場合:

- A のローカルキー `{T,''}`.  B の msg 到着 `{T,'b'}` → `'b' > ''` で勝敗が
  つき **A は B の名を採用** (`_namePeer='b'`).
- B のローカルキーも `{T,''}`.  A の msg 到着 `{T,'a'}` → **B は A の名を採用**.

両者が相手の名を採用する「入替わり」で、以後の改名がない限り恒久発散。
正しい挙動は双方が同じ `(ts,peer)` 比較を行い **一方向にだけ収束** すること
('a'<'b' なら両者とも B の名)。

## Fix

`_bName` で `_nameTs` と `_namePeer=_pi()` を同時刻印:
`{const ts=nowTs();_nameTs=ts;_namePeer=_pi();Net._bcast(...)}`.
送出側・受信側が同一の writer キーを参照するようになり、同 ts 競合は
全ピアで同一勝者に収束する。`pageName` は `_pgRename` が `op.clock.peer`
を刻印し forward apply が `p.ntp=op.clock.peer` を書くため既に対称。

## Consequences

- 同 ts 改名競合は恒久発散せず、(ts,writer) 全順序で単一勝者に収束。
- test.mjs の ADR-0581 ソースピンを新形態へ更新 (`_namePeer=_pi()` 刻印を固定)。
