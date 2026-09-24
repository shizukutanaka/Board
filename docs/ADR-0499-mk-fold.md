# ADR-0499: `_mk` — 送信メッセージ組立ての集約

## 状態

実装済 (v1.7.532)

## 背景

`{k:'X',peer:_pi(),...}` (自ピア id を同梱した wire メッセージ envelope) が
bye / hello / sync-req / ping / cursor / selection / name / snapshot の
9 サイトに複写 — 組立てサイト毎に `peer:_pi()` が散在。

## 決定

`_mk(k,x)=>({k,peer:_pi(),...x})` に集約 — peer 同梱を envelope 構造として一語化。
`peer` を埋め忘れる新規メッセージを構造的に防ぐ。

## 影響

- index.html −47B (523,413 → 523,366)
- 動作変更なし
