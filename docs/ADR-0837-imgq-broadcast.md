# ADR-0837 — imgq を _bcast で送出する

## Context

ADR-0835 の parked-ref 再要求は presence heartbeat から `this._send(_mk('imgq',…))`
で送られていた。`_send` は **BroadcastChannel 専用** (同一ブラウザのタブ間) —
RTC DataChannel を通る経路は `_bcast` (`_send` + `_sendDC`) のみが使う。

imgq が BC にしか流れないと、**WebRTC 招待リンクで繋いだ RTC-only のピアには
再要求が一切届かない**。これは実害である: 送信中の切断で blob が途切れるのは
ネットワークを挟む RTC リンクこそ最も起きやすく、BC ローカル通信ではほぼ起きない。
つまり修復経路が最も必要なトランスポートで機能していなかった。

## Decision

スイープの imgq 送出を `this._bcast(...)` へ変更。`_bcast` は BC postMessage と
`_sendDC` (SCTP バックプレッシャ付き funnel) の両方を叩く既存の dual-transport
fold — 新しい送信導線は導入しない。

## Why not other heartbeat sends

- `ping`/`sync-req`/`hello` は意図的に BC-only (0401/0740 の設計 — RTC 側は
  dc イベントと invite フローがピア確立を担う)。imgq は対照的に **要求-応答**:
  blob を保持する全ピアに届ける必要があるため `_bcast` が正しい。
- 応答側 (`_flushImgOuts`) はもともと `_bcast` — 本修正で要求側と対称になる。

## Test

imgq ピンにソースアサーション追加 — スイープが `this._bcast(_mk('imgq',…))` を
使うことを固定。
