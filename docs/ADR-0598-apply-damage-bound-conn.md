# ADR-0598: `_apply` のダメージ収穫に束縛コネクタの掃引領域を含める

## 状態

実装済 (round307)。ローカルドラッグ側は ADR-0597。

## 背景

ADR-0027 の op 単位ダメージは op が触れる id 集合 `_ids` の before/after bbox のみを
収穫する。束縛コネクタは `aF`/`bF` で束縛先 extent から端点を動的解決するため、
リモートの `move`/`align`/`resize`/`upd`/`style` op で束縛先が変形するとコネクタの
見た目 path も変わる — しかしコネクタ id は op に含まれず、掃引領域がダメージ外に
残りリモート側で残像が出ていた (ADR-0597 と同型、wire 受信側)。

## 決定

`_apply` の `_ids` 確定後に、`_conn(s.type) && ((s.aF && _ids.has(s.a)) || (s.bF && _ids.has(s.b)))`
で束縛コネクタ `_bc` を収集。変形前ループで `_u(c)` (pre-bbox)、post-mutation で
`_u(byId(c.id))` を合流。`_u` は `_bb` (経路解決済み extent) + ストローク余白で
掃引領域を覆う。コネクタ自体が del で消えた場合は post が undefined をスキップ。

## 影響

- `applyRemote` 経由の全 op で束縛コネクタの残像が出ない。ローカル undo/redo の
  `_apply` も同じ経路を通るため同時に解消。
- オーバーカバーは安全側 (bbox union) のみ — 既存の 0.6 ビューポート閾値で全体
  invalidate にフォールバックする挙動は不変。
