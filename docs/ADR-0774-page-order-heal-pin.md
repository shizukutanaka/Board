# ADR-0774 — ページ順序 heal の behavioural ピン

## Status
Accepted (v1.7.800)

## Context
ADR-0773 の順序採用はソースピンのみで、リグレッション検出がなかった。
順序ロジックは「スナップショット配列順 + ローカル専有を末尾」という二段構造
のため、特にローカル専有ページの扱いを実動作で固定する必要がある。

## Decision
`Net._onRecv` 経由の実系列ピン:

```js
state.pages=[p1,pX,p2];  // pX はスナップショット不在のローカル専有
_onRecv({k:'snapshot',pages:[p1,pY,p2]});
assert.deepStrictEqual(map(p=>p.id),['p1','pY','p2','pX']);
assert.strictEqual(state.curPg,'pX');   // curPg はローカル保持
```

同時に round523 の page-op 監査で確認した不変条件を記録:
unpage wire 経路 (0724/0725)・i 運搬 (0704)・`_pgAdopt` 内 `_vPages` 検証・
remote pageAdd の dup-id ガード・新規図形の `pg=curPg` スタンプ (2125)・
`_pgHealS` の dangling pg heal — すべて現状で完備、追加修正不要。

## Consequences
- 0773 の順序採用が回帰検出可能に。
- 監査済み不変条件が ADR として記録され、再監査コストが下がる。
