# ADR-0446: `dc.onclose` で `_dcQ` をリセット

## 状態
実装済 (v1.7.481)

## 背景
ADR-0432 の backpressure キュー `_dcQ` は `d.send()` 例外時に
`bufferedAmountLow` ハンドラへドレインを委ねる。リセット箇所は
`connectionState==='failed'` (ADR-0431/0385) のみだったが、
**`dc.onclose` ではリセットしていなかった**。チャネルだけが閉じて
connectionState が 'failed' に到達しない経路 (ピアのアプリ層 close、
ICE disconnected 直後の channel close) では `this._dcQ` が non-null のまま
残り、次の DataChannel でも `_sendDC` が常に enqueue するだけになる —
ドレイン・ハンドラは死んだチャネルに残っているため **再接続後の送信が
すべて静かに失われる**。

## 決定
`dc.onclose` 先頭で `this._dcQ=null`。`_wireDC` 経由で createDataChannel /
ondatachannel 双方のチャネルに効く。

## 影響
- 再接続後の op/presence 欠落を解消。既存の `broadcast` は `_dcQ` が null に
  戻れば通常の send 経路へ自然に復帰する。
