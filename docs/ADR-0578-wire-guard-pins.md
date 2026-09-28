# ADR-0578: wire 受信ガードの最終ピン化

## 状態
実装済み (v1.7.605)

## 背景
wire 受信経路の監査スイープ (cursor/selection/img/snap/opc/op/name/hello/
sync-req/snapshot/bye/ping の全メッセージ種別) で、既存ガードがすべて
回帰テストで固定されているかを確認した。`MAX_PEERS`・`_loResp`・
`_imgIn` bound・name 上限・cursor NaN 等はピン済みだったが、以下の2箇所が
未ピンだった:

- `_fragIn` の重複 seq スロット無視 `if(!sn.p[seq])` — 同一断片の再送で
  `sn.g` を二重カウントして早合点 join しないためのガード
- `_dcQ` requeue の 4096 上限 — 一時的に dc.send が throw する間の
  保留メッセージを無制限にためないためのガード

## 決定
両者にソースピンを追加。これで wire intake の DoS/再送耐性ガードは
全て回帰固定された。

## 影響
- 今後の refactor で重複スロット許容や無上限キューへ退行した場合に検出可能
