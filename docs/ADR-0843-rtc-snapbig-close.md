# ADR-0843 — snapBig 時に RTC リンクを閉じて joiner へ可視通知

## Context

RTC `dc.onopen` で送信者がスナップショットを組立て、24MB 超なら送信側のみ
`snapBig` toast を出して `return` していた (ADR-0403)。joiner は BC に乗れない
ため代替経路が存在せず、「connected」表示のまま**空盤面で永続待機**する —
嘘の接続状態は静かな発散より害が大きい。

## Decision

送信拒否時に `this.dc.close()` — 両端の `onclose` が発火し joiner は正直な
'disconnected' toast を見る。送信側は snapBig + disconnected (真実) となる。
`_rtcPeerId` の行も `onclose` が掃除するため追加処理は不要。

## Test

- 送信側キャップのソースピンを新しい閉鎖形へ更新
