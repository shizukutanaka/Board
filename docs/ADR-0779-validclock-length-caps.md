# ADR-0779 — validClock の peer/seq 文字列長上限

- 日付: 2026-09-29
- 状態: 実装済み

## Context

`validClock` は remote op の clock、スナップショットの `rep` マーカー、`wc` マップの
per-property clock を検証する唯一の共通ゲート。`peer`/`seq` は `_iS`/non-empty 判定のみ
で長さ無制限だった — `msg.peer` 自体は `MAX_PEER_ID_LEN`(64) でガード済みだが、
`op.clock.peer` は別フィールドで未検査だった。

`clock.peer`/`seq` の格納先は:
- `seenOps` の dedup キー (`_ck(op)` = `peer+':'+seq`) — 2,000 エントリ上限はあるが
  文字列長が無制限なら 1 エントリが数 MB になり得る。
- `state.wclock[id][prop]` の `{peer,ts,seq}` — **IDB doc レコードへ永続化**されるため、
  肥大した peer 文字列はクォータ消費に直結する。

敵性ピアが 1MB 級の peer/seq を持つ op を連投すると、見かけ上正規の LWW 収束経路を
通りながらメモリと永続化領域を同時に肥大させられた。

## Decision

`validClock` に上限を一点追加:
- `c.peer` — `MAX_PEER_ID_LEN` (64) まで (msg.peer の intake キャップと同一)。
- 文字列 `c.seq` — 80 まで (実用上の最大は `'snap:'+id` で ≤69;数値 seq は従来どおり
  有限チェックのみ)。

一点修正なので、これを呼ぶ全経路 — `applyRemote` の `op.clock`、snapshot `rep`、
`wcOk` 経由の `addMany.wc`/`replace.afterWc`/`_mergeSnapshotOp` — が同時に閉塞される。

## Consequences

- 敵性 op が seenOps/wclock へ任意長文字列を刻めなくなる。IDB 肥大化も防がれる。
- 正規 peer id は 32 文字 uid (+incarnation suffix で ≤39) かつ seq は数値または
  `'snap:'+id` なので、誤棄却は起きない。
- テストピン: oversized peer / oversized 文字列 seq の棄却、有効な文字列 seq の受理、
  棄却経路で wclock へ痕跡を残さないことの4件 (test.mjs ADR-0779 ブロック)。
