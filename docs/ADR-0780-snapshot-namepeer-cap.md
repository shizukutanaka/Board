# ADR-0780 — スナップショット `namePeer` の長さ上限

- 日付: 2026-09-29
- 状態: 実装済み

## Context

ADR-0779 で `validClock` に peer/seq の長さ上限を入れたが、同じ「clock-ish の
peer 文字列が永続化へ流れる」クラスの残穴が `_applySnapshot` にあった:

```js
if(_iS(msg.namePeer))_namePeer=msg.namePeer;
```

`msg.namePeer` は型チェック (`_iS`) のみ — `msg.peer` には intake で ≤64 の
キャップがあるが `namePeer` は別フィールドで無制限。`_namePeer` は
`ntp` として IDB doc レコードへ永続化される (ADR-0695) ため、無制限文字列は
ストレージを恒久的に肥大させた。

## Decision

`_iS(msg.namePeer)` / `_iS(d.ntp)` を `_idOK` (文字列 ≤64) へ統一:

- `_applySnapshot` の `namePeer` 代入 — wire 上の全 id と同じキャップ。
- `Persist` の `d.ntp` restore — pre-fix で書き込まれた肥大値をロード時に浄化
  (レコードは自己書込みだが、修正前の受容値が残り得る)。

`_idOK` 未満の値 (`undefined` 等) は従来どおり store しない — undefined は
`_iS` と同じく拒否、文字列は追加で長さ判定。

## Consequences

- 敵性スナップショットが `ntp` へ任意長文字列を刻めなくなる。
- `_namePeer` の全格納経路 (k:'name' の `msg.peer`、snapshot の `namePeer`、
  IDB restore) が同一の 64 キャップで揃う。
- テストピン4件: baseline 格納、oversized 棄却 (name 自体は ts 勝ちで適用)、
  有効値は引き続き格納 — `_snapshotMsg().namePeer` で観測。
