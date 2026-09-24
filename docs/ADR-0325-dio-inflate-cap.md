# ADR-0325: `_dioInflate` の deflate bomb ガード

## 状態
承認 — round57

## 背景
圧縮 .drawio の展開は `Response.text()` でペイロード全体を
無制限にバッファしていた。ドロップされたローカルファイルは
URL サイズ上限 (ADR-0039/0040) の外にあるため、巨大な
deflate ペイロードがタブをクラッシュさせ得た。

## 決定
`getReader()` + `TextDecoder` で逐次デコードし、8MB 超で
`null` (既存の dioCompressed 警告経路) に打ち切る。

## 断念した代替案
- 展開後 `txt.length` チェックのみ — メモリは既に消費済みで
  ガードとして無力。

## 影響
悪意ある圧縮ファイルでも OOM しない。2033 全緑。
