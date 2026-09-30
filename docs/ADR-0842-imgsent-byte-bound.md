# ADR-0842 — _imgSent の 64MB バイト上限 + _park 集約

## Context

`_imgSent` (key→dataUrl) は imgq 応答の送信側ソース: `_imgSlim` が shape の
dataUrl を content-hash 化して登録し、以後の imgq には Map 参照で即答する
(0836)。しかし **削除済み図形のエントリは残る** (他ピアが同キーを参照中かも
しれないため正しい設計) が、上限は部屋切替リセットのみ — 貼付→削除を繰り返す
長時間セッションで死んだ dataUrl (各 ~44MB まで) が無界保持されていた。
`_imgIn` は ADR-0784 で 256件/64MB に縛ったのに送信側は未対応だった。

## Decision

- `_slimShapes` (唯一の `_imgSent` プロデューサ経路) で puts 到着時に Map の
  合計バイトを合算し、64_000_000 超なら挿入順最古から evict。カウンタを持たず
  puts バッチ毎に O(size) で再計算 (puts は slim op 毎 1-5 件、頻度低い)。
- `sent` 引数あり (snapshot 用 transient Map) では発動しない — transient には
  寿命が無いため境界対象外。
- 駐車イディオム (256-cap 最古 evict + `{k,t0}` set) を `_park` へ集約し、
  wire 駐車 (0374/0835) とパッチ駐車 (0841) が同一規則を共有。

evict されたキーを後で imgq された場合は無回答 — `_imgIn` 側と同じ
boundedness↔healability トレードオフを送信側にも適用する。

## Test

- `_slimShapes` が blob を `_imgSent` へ登録する behavioural ピン
- バイト上限の存在を示すソースピン
