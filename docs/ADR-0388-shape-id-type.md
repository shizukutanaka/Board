# ADR-0388: shape id の型・長さ検査

## 状態
採用 (v1.7.430)

## 背景
`validShape` の id 検査は `!s.id` の真偽のみ — `{id:123}` の数値 id が通過し、
`_idIndex` Map に数値キーとして入る。内部的には一貫するが、文字列キーでの
`byId('123')` 検索・connEnds の `s.a`/`s.b` 解決・`seenOps` dedup で
型混在による静的に追いにくい分裂が起きる。patches/del は既に
`typeof p.id==='string'` を要求していたため形状側も揃える。

## 決定
`typeof s.id!=='string'||s.id.length>64` を拒否 (64 は peer id 上限
MAX_PEER_ID_LEN と同スケール)。

## 影響
数値/巨大 id の図形は全 intake 経路で棄却。
