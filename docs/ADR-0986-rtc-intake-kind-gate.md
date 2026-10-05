# ADR-0986: RTC intake の BC-only 種棄却 + presence 行の蘇生

## Context

`_onRecv(msg, viaRtc)` は BC と DataChannel の双路を受ける。設計上 `hello`/`ping`/`sync-req` は `_send` (BC-only) 経由のみで送られ DC には乗らない (コメント自体が宣言)。'bye' は pagehide の `Net._bcast(_mk('bye'))` により DC にも乗る正当種。

## Defects

1. **偽造 BC-only 種のスプーフ**: viaRtc 到達の `hello`/`ping`/`sync-req` が `this._touchPeer(msg.peer)` を叩く。`msg.peer` は任意文字列で、RTC ピアは (a) 存在しない id の phantom 行、(b) **他者の実在 id の偽 presence 行** (cursor/selection 系と合わせ他者偽装) を作り `_loResp` スナップショット応答選出も攪乱。行は hello 相当の定期再刻印で延命する。ADR-0827 が BC 側の偽造 `rtc:` id を棄却した対称の残穴。

2. **`bye` viaRtc の `_rtcPeerId=null`**: link が生き続ける経路 (bfcache 復帰・'bye' race) で `peerKey=null` となり以後の全 presence 系 msg が棄却 → **接続中のまま presence 永久 blackout**。行の再作成は `hello` に依存するが RTC では二度と来ない。

3. **presence 行の復帰不能**: 'bye' で消えた行は DC では再作成経路を持たない。BC 側は 'ping' が行を再タッチして自然復帰するのに対し、viaRtc 側はピアが cursor を流し続けても死んだままの非対称。

## Decision

- `viaRtc` 到達の `hello`/`ping`/`sync-req` を switch 前に早期棄却 ('bye' は 8861 の `_bcast` で正当に乗るため残す)。
- 'bye' viaRtc は行削除のみ行い `_rtcPeerId` を null 化しない — ルーティング鍵の所有者は `onclose`/`connectionstatechange-failed` (ADR-0822 で superseded 耐性済み)。
- viaRtc の `cursor`/`selection` で `peerKey` あり・行なしなら `_touchPeer(peerKey)` で蘇生。peerKey はローカル合成 id (`_rtcPeerId`) なので偽造不能、「実際にメッセージを送るピアは present」が不変条件となる。BC 側は従来どおり enrich-only (任意 peer の cursor が行を作らない) を維持。

## Consequences

- 偽造 'bye' の効果は自己限定 (行削除しても次の正当 msg で蘇生)。
- bfcache 復帰・'bye'-then-active のいずれも presence が次 msg で自然回復。
- 既存 ADR-0825 ピン ('bye' viaRtc が `_rtcPeerId` を null 化) を新契約へ更新。

## Verification

`node test.mjs` 3235 pass / 0 fail。新ピン: viaRtc bye 後 `_rtcPeerId` 保持・cursor で蘇生・cursor 適用・forged ping/hello/sync-req 棄却・BC ping 正常・BC ghost cursor 非創建 (enrich-only 維持)。
Raw 556,985B (<557,056B 上限)。
