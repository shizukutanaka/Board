# ADR-0869: セッション内蓄積監査 — 完走記録

## Context

wire 取込の値/件数上限監査 (0775–0868) に続き、**セッション内で増大し得る全蓄積面**
を走査した。対象はリモート起点・ローカル起点双方のキュー/マップ/リスト。

## 監査結果 (全構造 bounded — 実害なし)

| 構造 | 上限 | ADR |
|---|---|---|
| `Net.peers` | `MAX_PEERS=32` (新規は wait/reap) | — |
| `_imgqT` | 保持済みキー (_imgSent/_imgIn) のみ登録 | 0836 |
| `_imgOuts` | push 直後 `_flushImgOuts` で同期ドレイン | 0781 |
| `_imgPending` | 形状 id 単位 (≤盤面) + 60s TTL | 0835 |
| `_imgSent`/`_imgIn` | 64MB バイト + 256 スロット | 0842/0784 |
| `_imgChunks`/`_snapIn`/`_opcIn` | 12MB/24MB/32MB + 60s TTL | 0781–0786 |
| `_dcQ` | 32MB バイト + 4096 件 | 0783 |
| `seenOps` | 2000 (20% トリム) | — |
| `wclock` | 8192 超で墓標のみ保持 | 0738 |
| undo list | `MAX_HISTORY=500` | — |
| toast | 同一内容 re-append + 個別消去 | 0389 |

## 非採用の検討: 総図形数ゲート

wholesale 取込は `SHARE_MAX_SHAPES` (200k) で制限されるが、リモート個別
'add'/'addMany' op の累積には総数上限がない。ゲートを導入すると**到着順序依存**
になり恒久発散を招くため非採用: ピアAが 200k 件目まで受信後に X を棄却、
ピアBが先に X を受信して受理 → 以後両者の盤面集合が異なるまま固定される。
各 op の自己完結検証 (`validShape`/`validPatch`) は既に全 op 共通で、
累積状態に依存しない上限のみが収束安全である。

## Consequences

- 蓄積面の残監査は完走 — 以後の監査対象は別サブシステムへ
