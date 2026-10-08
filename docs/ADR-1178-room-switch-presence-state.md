# ADR-1178 — ルーム切替で presence 送出状態をリセット (self-latecomer)

- Status: Accepted (round928)
- Date: 2026-10-01

## Question

`Net.init(roomId)` はルーム切替の漏斗で、seenOps・snapshot・img/frag/dc キュー・
非 rtc ピア行・presence heartbeat をすべてリセットする (ADR-0458/0459/0464/0466/0467/
0836/1049/1056/1059/1061)。しかし**送出側**の presence 帳簿 — dedup キー
`_lastSelSent` とスロットル時計 `_lastSelAt`/`_lastCursorSend` — はリセット対象に
入っていなかった。ソクラテス問答:

- `sendSelectionIfChanged` は「同じキーなら送らない」dedup を持つ (ADR-0011)。
- 新しいルームのピアは、自分がこれまで「同じ」を知らない。
- 自分がルーム B へ join したとき、ルーム B の既住ピアは `_lastSelSent` の
  内容を受け取っていない — dedup キーは「受信者が既知」を前提にする。
- その前提はルーム単位でしか成立しない。

## Audit — 実害

1. ルーム A で選択を送った後、`Net.init('roomB')` でルーム B へ移る。
   `_lastSelSent` はルーム A で送ったキーのまま残る。
2. ルーム B の既住ピアは 'hello' を受け取るが、選択プレゼンスは届かない:
   次のフレーム呼び出しが `key === _lastSelSent` で dedup 棄却される。
3. ユーザが選択を変更しない限り、ルーム B では自分の選択ハイライトは
   永久に不可視 — `_touchPeer` は遅参ピアの再送 (ADR-0011) だが、
   **自分自身が遅参になった経路**では誰も `_touchPeer` を呼ばない。

`_lastCursorSend` も同クラスだが、カーソルは連続送出するため実害は
初回送出が最大1窓遅れるのみ。`_selT` (ADR-1177 の trailing timer) は
発火時にキーを再評価するためそのまま残しても新ルームで現選択を正しく
送出し、クリア不要。

## Decision

`Net.init` のリセット群に送出側 presence 状態を加える:

```js
this._lastSelSent='';this._lastSelAt=0;this._lastCursorSend=0;   // ADR-1178: self-latecomer
```

dedup キーを空にすると次フレームの `sendSelectionIfChanged` が「変化あり」と
判定して現選択を一度送出する — つまり新ルームへの即時アナウンス。
`_touchPeer` の遅参リセット (`_lastSelSent=null;_lastSelAt=0`) と同じ規約を、
自分が遅参になるイベントへ適用する。`_selT` は触らない (発火時再評価で
自己訂正する設計)。

## Consequences

- ルーム切替後、自分の選択ハイライトが新ルームの既住ピアへ届く
  (遅参 parity: 後から入るピアは `_touchPeer` がリセットして届けていたのと
  対称)。
- カーソル初回送出の残留窓も解消。
- 同ルーム再 init では選択が1度だけ再送出される (無害・自己修復)。
- ピン: 挙動5 (init で三フィールドが 0/''、init 後の次回送出が届く) +
  ソース1 (リセット行の存在)。
