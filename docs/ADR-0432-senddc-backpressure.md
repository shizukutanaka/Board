# ADR-0432: `dc.send` のバックプレッシャ再キュー (`_sendDC`)

## 状態
実装済 (v1.7.467)

## 背景
WebRTC DataChannel の `send()` は SCTP 送信バッファが満杯のとき
`InvalidStateError` を投げる。全ての送信サイトは `try/catch` で囲まれ
失敗を呑んでいたため、バースト時 (大きな `snap`/`opc` フラグメント列の
途中など) に**メッセージが順序を保ったまま消失しうる** — 受信側は
欠けたフラグメントを待ち続け、op なら静寂に欠落する。
`bufferedAmount` の事前チェックは競合する送信経路があると不十分で、
正しい再送には送信側キューが要る。

## 決定
全 `dc.send` サイトを `_sendDC(m)` に集約:

- キュー非空なら push のみ (順序維持、4096 上限)
- `dc` 非open なら drop (従来通り)
- `send` が投げたら `{m}` でキュー開始し `bufferedAmountLowThreshold` を
  設定、`onbufferedamountlow` で再送。再送中の再 throw は再キューで処理
- `dc.onclose` で `_dcQ` を `_snapIn`/`_opcIn` と同所で破棄

フラグメント化された `snap`/`opc` も同じファネルを通るため、キュー上の
順序は送信順と一致する。

## 影響
- バッファ満杯時の静寂消失を解消 — 低速リンクでの信頼性向上。
- BroadcastChannel 経路 (`_send`) は従来通り (backpressure 概念なし)。
- 併せて `_hd` (`s.visible===0`)、`_fS` (`s.fontSize` read)、`_wh`
  (`e.width=;e.height=` pair) の shorthand fold で ~370B 回収。
