# ADR-0838 — wire 送出トランスポート監査完走

## Scope

`this._send(` と `this._bcast(` の全送出サイトを対象に、各 wire kind が届くべき
ピア集合 (BC タブ群 / RTC DataChannel ピア / 両方) と実際のトランスポートの
一致を照査した。

## Findings

| site | kind | transport | verdict |
|---|---|---|---|
| `Net.init` | `bye` | `_send` (BC) | ✓ RTC 側は `dc.onclose` が担う |
| heartbeat | `hello`/`sync-req`/`ping` | `_send` (BC) | ✓ RTC ピアは `_rtcPeerId` 合成行 + dc イベントで管理 (ADR-0010/0740) |
| heartbeat | `imgq` | ~~`_send`~~ → `_bcast` | **✗ → ADR-0837 で修正** |
| heartbeat | `sync-req` retry | `_send` (BC) | ✓ 同上 |
| `_flushImgOuts` | `img` chunks | `_bcast` | ✓ |
| `broadcast` | `op` | `_send` + `_sendDC` (≧200KB は `opc` frag) | ✓ dual |
| `sendCursor`/`sendCursorHide`/`selection` | presence | `_bcast` | ✓ |
| `_sendSnapshot` | `snapshot` | `_send` (BC) | ✓ BC 側の hello/sync-req 応答専用。RTC 側は `dc.onopen` の `_fragSend` で snapshot を直接送る設計 |
| `dc.onopen` | `snapshot` | `_fragSend` → `_sendDC` | ✓ RTC 初期同期 |
| `_fragSend` | `snap`/`opc` | `_sendDC` | ✓ RTC のみ (SCTP 上限対策) |
| `pagehide` | `bye` | `_bcast` | ✓ (0453: bfcache 追い出しでは dc も死ぬので両経路へ) |
| `_bName` | `name` | `_bcast` | ✓ |

## Rule

- **要求-応答プロトコルの要求側は `_bcast`** — 保持者がどのトランスポートの
  ピアかを要求側が知り得ないため (0835/0837 の教訓)。
- presence 系の heartbeat (`hello`/`sync-req`/`ping`) は BC-only — RTC 側は
  DataChannel のライフサイクルイベントがピア確立・維持を担う (0401/0740)。
- ローカル sweep (`_reapPeers`/`_reapFrags`/`_imgPending` 掃除) は送出を伴わず
  トランスポート選択の対象外。

## Doc sync

architecture.md の imgq 段落に `_bcast` 化・`_imgqT` スロットル・
ルーム切替リセットを同期 (0835/0836/0837 の反映)。
