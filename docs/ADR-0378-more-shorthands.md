# ADR-0378: 追加 shorthand 一括化 (_pi/_ro/_gd/_cl/_bb/_oa)

## 状態
採用 (v1.7.423)

## 背景
512KB raw 上限への headroom が ~1.2KB に迫り、新機能を入れる余白がなかった。
ADR-0365/0366 で `state.*` 主要11フィールドと関数群を shorthand 化した後も、
未カバーのフィールド (`peerId`/`readout`/`guides`/`clipboard`) と
`G.bbox(`×59/`Object.assign(`×29 が残っていた。

## 決定
- 読み取り専用 live-read: `_pi=()=>state.peerId`, `_ro=()=>state.readout`,
  `_gd=()=>state.guides`, `_cl=()=>state.clipboard`
- `_bb=s=>G.bbox(s)` (59サイト)、`_oa=Object.assign` (29サイト)
- 書き込みサイト (`state.X=`) は rebind-guard regex でリテラル維持
- ~650B 回収し headroom ~1.8KB に回復

## 断念した代替案
- `state.X` フィールド自体を `let` に独立させる案 — 全 write サイトの書換が要り、
  関数形 shorthand のほうが差分が小さい
