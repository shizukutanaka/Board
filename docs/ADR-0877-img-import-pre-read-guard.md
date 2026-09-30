# ADR-0877 — 画像取込に事前サイズガード (_bigFile parity)

## Status
採用 (v1.7.903)

## Context
`_imgImportFile` (drop/paste 共有の画像取込) だけが `f.size` の
事前チェックを持たず、巨大画像ファイルを `FileReader.readAsDataURL`
で全体読み込みしてから `reader.result>16e6` で棄却していた。
他の全インポータ (`importBoard`/`importExcFile`/`importDrawioFile`/
`importSvgFile`) は `_bigFile` (32MB) で読み込み前に棄却する。

数百MB の画像をドロップすると ~1.3x の base64 文字列としてメモリに
乗ってから棄却される — タブのメモリスパイク DoS (P1 改善、真の欠陥)。

## Decision
関数先頭に `if(_bigFile(f)){_wT(_IB);return}` を追加 — 他経路と同一の
32MB 閾値・同一の拒否トースト `_wT(_IB)` で parity。既存の 16MB
dataUrl チェックは read 後の精密ガードとして据え置き (32MB バイトでも
16MB 超の dataUrl になる場合があるため二段構え)。

## Consequence
- 巨大ファイルは読み込み前に棄却 — メモリスパイク経路を閉塞。
- raw 帳尻はコメント圧縮 (ingest ブロック ~90B + guard 注 ~80B)。
- behavioural ピン: fake FileReader で `size>32MB` が `readAsDataURL`
  を一度も呼ばず `cb` 未到達 + 拒否トースト発火を固定 (3 asserts →
  2901 pass)。
