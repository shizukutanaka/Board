# ADR-0498: `_pk` — RTC/BC ピアキー振分けの集約

## 状態

実装済 (v1.7.531)

## 背景

`viaRtc?this._rtcPeerId:msg.peer` (RTC ピアは synthetic id、BC ピアは msg.peer
で記録) が `case 'bye'` / `'cursor'` / `'selection'` の 3 サイトに複写。

## 決定

`_pk(msg,viaRtc)` メソッドに集約 — 受信メッセージから記録キーを引く振分けを
一箇所に集約。変数名も `pk`/`peerKey` のばらつきを `_pk` 一語に統一。

## 影響

- index.html ~+130B gross→net 微小 (def コストを差し引いた net)
- 動作変更なし
