# ADR-1182 — peer lifecycle contract (監査完走 + ピン)

## Status
Accepted (docs+pin ラウンド)

## Context

round932 は presence のライフサイクル面を監査: `bye`・`_reapPeers`・
`Net.init` のルーム切替・`_onConnChange` (join/leave SR announce) ・
avatar UI (`refreshPeers`) ・round929/1177 で追加された armed タイマー
(`_curT`/`_selT`) のルーム横断セマンティクス。結果は clean 完走。

## 監査した契約 (全て現行コードが保持済み)

| 契約 | 実装 |
|---|---|
| `bye` は `_pk` 経由で行を削除 (BC=自身 id、RTC=fold 先) | `_onRecv` case 'bye' |
| 未知ピアの `bye` は no-op (`delete` 失敗 → `_ivO` も走らない) | 同上 |
| BC で `rtc:` prefix id は envelope で棄却 (他人の RTC 行は消せない) | ADR-0827 |
| `_reapPeers` は `lastSeen` が `NET_PRESENCE_TIMEOUT`(15s) 超の BC 行を削除 | reap loop |
| `rtc:` 行は TTL reap 免除 (ライフサイクルは dc.onclose が管理) | `_sw(id,'rtc:')` skip |
| `Net.init` は非 `rtc:` 行を全 purge + `_pCt` を再ベースライン | ADR-0458/0467 |
| join/leave announce は `_pCt` デルタ駆動 (phantom なし) | `_onConnChange` |
| armed `_selT`/`_curT` はルーム横断で firing — dedup key がリセット済みのため「正確な現状態の早期 announce」に化ける (self-latecomer 等価、実害なし) | ADR-1177/1179 の設計補完 |
| `sendCursorHide` は `_curT` を disarm、`_selT` は残す (hide≠selection) | ADR-1180 |
| `pagehide` は best-effort `bye`、残存は 15s reap で掃除 | ADR-0456 |
| MAX_PEERS=32 で flood 上限、reap で開放 | `_touchPeer` |
| avatar tooltip の `p.pg` は `_pgById` で実在頁に限り解決 | ADR-0670 |

## Decision / Consequences

修正なし — 11ピン (9挙動+2ソース) で契約固定:
BC `bye`→行削除、未知 `bye`→no-op、RTC `bye`→`_pk` 経由でリンク行削除、
stale BC 行 reap、`rtc:` 行 reap 免除、ルーム切替で BC 行 purge、
`_pCt` 再ベースライン + ソースピン×2。
