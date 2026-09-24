# ADR-0475: join 時 `sync-req` の有界再送

## 状態

実装済 (v1.7.508)

## 背景

joiner は `Net.init` で `hello` + `sync-req` を**一度だけ**送信する。応答パスは:

- BC: 最小 id ピアが `_sendSnapshot` (ADR-0465) — 1 秒スロットル (ADR-0452)
- RTC: `dc.onopen` で即時 snapshot 送出 — 断片化して `_sendDC` 経由

この応答が失われると joiner は**空盤面のまま永遠に待機**する:

- `_sendDC` は >256KiB ドロップ (ADR-0438)・4096-queue 溢れ (ADR-0432) でメッセージを捨てる
- `_fragIn` の再組立は `n`/`src` 不一致で再開するが、中途断片が脱落した組は `sn.g` が
  `n` に達せず完了しない — 失われたチャンクの再送機構はない
- joiner 側にもリトライはなく、`ping` はプレゼンス専用で snapshot を誘発しない

## 決定

presence interval (5 秒) の tick で `!_snapRx && _snapRetry++ < 3` の間 `sync-req` を再送。

- `_snapRx`: `case 'snapshot'` で `true` (空スナップショットでも受領=リンク健全と判定)
- `_snapRetry`: 部屋切替 (`Net.init`) で `0` にリセット
- 3 回で打ち切り (×5 秒で ~15 秒) — 以後は periodic な要求を出さない (無限再送で応答側を
  圧迫しない; その後も op は個別に届き、追加の `hello`/`sync-req` はユーザの再 join で回復)

## 影響

- SCTP ドロップ・スロットル競合で失われた初期スナップショットが自動回復
- 応答側のコストは bounded (再送 ≤3、従来の 1 秒スロットルも併存)
