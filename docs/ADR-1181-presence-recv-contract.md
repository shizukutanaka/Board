# ADR-1181 — presence 受信側契約 (監査完走 + ピン)

## Status
Accepted (docs+pin ラウンド)

## Context

ADR-1177..1180 が presence **send-side** の完全性を閉塞したのに対し、
round931 は **receive-side** — ピア行 (peer row) の生成・採用・描画経路を監査。
結果は clean 完走のため、契約を13ピンで固定した。

## 監査した契約 (全て現行コードが保持済み)

| 契約 | 実装 | 既存 pin |
|---|---|---|
| envelope peer は `_iS` かつ ≤`MAX_PEER_ID_LEN` | `_onRecv` 冒頭 (MAC より先) | :1162 ソース |
| BC 経路の `rtc:` 偽造 id は拒否 | 同上 (ADR-0827) | :2920 挙動 |
| `msg.peer===_pi()` 自己エコーは棄却 | `_onRecv` 冒頭 | — |
| BC presence は**行を mint しない** (ping/sync-req でのみ生成) | `_touchPeer` は viaRtc のみ | — |
| viaRtc presence は `_touchPeer` で行を復活 | ADR-0986 | — |
| cursor x/y は `_xyOK` (≤1e7) | ADR-1142 | 7 asserts |
| `h===1` → `p.cursor=null` | intake | :10794 |
| `pg` は `_s0(msg.pg,64)` で截断 (cursor/selection 両側) | intake | — |
| sel ids は `_iA`/`_idOK`/`byId`/`_s0(,4096)` の多層フィルタ | ADR-0485/1080 | 3 asserts |
| 描画側は `_hd`/`_pgOk`/page ゲートで self-limiting | drawPeerSelections/Cursors | 複数 |
| `_nIn` は 24字トリム、sink は title/canvas で安全 | ADR-1138 | :18310 |

## Decision / Consequences

修正は一切不要 — ピンのみ。追加したのは上表の未固定項目:
BC 未知ピアの cursor が行を mint しない、ping → cursor 着地、
pg 64字截断、非配列 ids 拒否、死 id+非 wire id の intake フィルタ、
過長/自己/偽造 `rtc:` peer 拒否、viaRtc 行復活、`h:1` → null、
`_s0(,4096)` キャップ、両 presence kind の pg bound — **11 挙動 + 2 ソース = 13 ピン**。

`_pk` の viaRtc フォールド (ADR-1032)・`_touchPeer` の MAX_PEERS キャップ・
`_reapPeers` の TTL reap (`rtc:` 除外) も確認済みで既存ピン網羅。

信頼境界: 全 wire メッセージは HMAC (部屋秘密鍵) 認証が前提 (ADR-1056) —
MAC 保持者による forged `bye` は設計上許容 (全 op 系と同じ脅威モデル)。
