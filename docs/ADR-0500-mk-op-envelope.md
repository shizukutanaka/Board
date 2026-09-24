# ADR-0500: `op` メッセージを `_mk` envelope に統一

## 状態

実装済 (v1.7.533)

## 背景

`broadcast()` の `this._send({k:'op',op:s})` だけが `peer` を同梱しない裸 envelope
だった — 他の全 wire kind (`bye`/`hello`/`sync-req`/`ping`/`cursor`/`selection`/
`name`) は ADR-0499 の `_mk` で `{k,peer:_pi()}` に揃っている。

## 決定

`this._send(_mk('op',{op:s}))` に置換 — envelope の構造を wire 全体で一貫化。
受信側は `msg.peer===_pi()` 自エコー除去に使う (BC は自配送しないが、将来の
中継経路で必要になる保険)。`msg.op` の内容は変わらない。

## 影響

- index.html ~+4B (envelope に `peer` 追加、_mk で −8B)
- 動作変更なし (受信側は `msg.op` のみ読む)
