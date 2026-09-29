# ADR-0616: ローカル 'replace' commit で _lastRep marker を記録

## 状態
実装済 (v1.7.643)

## 背景
ADR-0614 の勝者規則は `state._lastRep` が「適用済み最新 swap の clock」を
知っている前提で動く。が、実際の import 経路 (`_repC` → `Store._recordCommitted`)
は呼出し側が盤面を直接書換えるため `_apply` を通らず、marker は立たなかった。
`Store.commit` 経路だけが `_apply` 経由で marker を得ていた。

結果: ローカルで共有リンク/.board を取り込んだ直後に、自分より古い clock の
リモート 'replace' が届くと `_lastRep===null` で棄却されず適用 — ローカルは
リモート盤面へ、リモートはローカル broadcast した新しい swap を適用して
ローカル盤面へ。**両者が入れ替わる逆方向の発散** — 0614 が防ぐはずの
ケースそのもの。

## 決定
`_recordCommitted` で `_fck` の直後に marker を記録:

```js
if(op.op==='replace')state._lastRep=op.clock;
```

これで marker の記録点は `_apply` (commit/redo/リモート適用) と
`_recordCommitted` (caller-applied commit) の2箇所 — 'replace' の全発生経路を
網羅する。

## 影響
- ローカル import と並行するリモート swap が clockNewer の全順序で正しく
  勝者を選び、全ピアが同一盤面へ収束 (0614 の設計意図が全経路で成立)
- 既存の `_apply` 側の記録と重複しても副作用なし (冪等の同一値書込み)
