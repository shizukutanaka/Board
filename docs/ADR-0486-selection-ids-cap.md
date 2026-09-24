# ADR-0486: presence `selection` の `ids` に ≤64 キャップ

## 状態

実装済 (v1.7.519)

## 背景

ADR-0485 が validRemotePayload の全 op レベル id フィールドに ≤64 キャップを
適用したが、wire にはもう一つ id 配列フィールドが残っていた: presence
`selection` メッセージの `msg.ids`。従来は `_s0(msg.ids,MAX_OP_SHAPES)` で
配列長を抑え `_iS(id)` で型のみ検証 — 各 id の文字列長は未検証だった。

## 決定

`.filter(id=>_iS(id)&&_ln(id)<=64)` に拡張。peer.sel の値として Map キー化・
描画ループで参照される値なので、他の wire id フィールドと同じ ≤64 規約を適用。

## 影響

- index.html +~55B (523,526 → 523,581)
- 動作変更なし (合法の selection ids は影響を受けない)
