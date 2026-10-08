# ADR-1165 — delta-snapshot intake contract (dels/ops/rep gates)

## 状態
採用済み (v1.8.189) — 監査 clean 完走につき契約ピンのみ (コード変更なし)

## 文脈

ADR-1055 の delta-snapshot 経路 (`'snap:'` seq チャネル) は3つの独立した
受け入れ面を持つ: (a) `dels` — ページ id を含む tomb 広告 (ADR-1093)、
(b) merge `ops` — 送信者の存在時計を運ぶ 'add' 限定 op (ADR-0932)、
(c) `rep` — 世代勝者のみ受理する因果マーカ。いずれも後から弱められれば
収束が壊れる一方、個別 ADR に散在して回帰検知が無かった。

## ソクラテス式確認

- Q: 偽造 `dels` で生きた図形を殺せるか? — 否。`_idOK(id)&&validClock(c)`
  前提で tomb は clone 記録され、`s.locked||!_tAlive(id)` の skip が
  born-newer エスケープ (ADR-0926/1094) と lock parity を効かせる。
  ページ id でも同じループが `_pgDel2` で del parity splice。
- Q: `ops` に `del`/`upd` を紛れ込ませられるか? — 否。`_mergeSnapshotOp`
  の入口が `op.op!=='add'||!op.shape` を棄却 (add-only ゲート)。
- Q: op 時計の peer を偽装できるか? — 否。`op.clock.peer===msg.peer` の
  エンベロープ結合 (ADR-0932) で不一致 op は全棄却。
- Q: joiner が全空盤を要求する snapshot を古い世代で汚せるか? — 否。
  `rep` が `_lastRep` に clockNewer で負ければ wholesale 棄却。
- Q: sender が死んだ tomb を広告して誤殺するか? — 否。`msg.dels` は
  `_bN` (born-newer)・`validClock`・`clockNewer(w._del,c)` の3ゲートを
  通った「生きた tomb のみ」(ADR-1093)。

## 決定 (契約)

- `dels` intake: bounded id + validClock + tomb 記録 + `!_tAlive`/locked
  skip + `_pgDel2({id,clock:c},re,null,undefined,pi===0?id:null)` での
  ページ parity + `pages` union-heal — 固定。
- merge `ops`: 'add' 限定 + `op.clock.peer===msg.peer` + per-prop LWW
  (`op.wc` 時計対抗) + local-winner 発散時の収束 `upd` emit — 固定。
- `_applySnapshot`: `for(const s of valid)_wAdopt(s.id,wm.get(s.id))`
  による carried existence-clock スタンプ — 固定。
- `rep`: sender 時計が `_lastRep` に負ければ snapshot 全体棄却 — 固定。
- `'snap:'+id` seq は ts:0 の dedup 専用で仲裁しない — 固定。

## 検証

13 behavioural asserts (MAC スタンプ済み実 `_onRecv` 経路):
tomb kill / born-newer escape / ページ splice / 100-char+`__proto__` junk
無視 / forged `del` op skip / envelope peer 不一致棄却 / merge LWW 両方向 /
`_wAdopt` スタンプ / stale-rep 棄却。+ 3 source pins (dels ゲート・sender
広告3条件・`_wAdopt` 呼出)。
