# ADR-0454: _imgChunks の n-mismatch 再スタート + _selUnl 述語折り畳み

- 状態: 実装済
- 日付: 2026-09-23

## 背景

1. `_imgChunks` の受信チャンク再組立は `st.n===n` ガードで、既存アセンブリと異なる
   チャンク総数 `n` のメッセージをすべて棄却していた。送信側が同じ key で
   ストリームを再送した場合 (再送・版違い・bad peer)、stale partial が
   `_imgChunks` に残り続け、新ストリームは永久に再組立できない
   (`_fragIn` で ADR-0448 として直したのと同種のスタール)。参照を保持する
   `_imgPending` の shape は blob が来ない限り表示されないまま残る。
2. `_selAny(s=>EXPR&&!_lk(s))` (unlocked-selection 判定) が 17 箇所に重複。

## 決定

1. `_imgChunks` も `_fragIn` と同じ **fresh stream wins** に合わせる:
   `if(!st||st.n!==n)` で n-mismatch 時に古い partial を捨てて新アセンブリを
   開始。64-key cap の最古エビクト (ADR-0449) は新規 key のみに発動するまま維持。
   正当なピア間では同じ key (content hash) は常に同じ `n` を持つため、
   実害が出るのは bad peer / 版混在のみだが、拒否は半永久的スタールに
   なり得るため恒久的に直す。
2. `_selUnl=f=>_selAny(s=>f(s)&&!_lk(s))` を導入し 17 箇所を畳み込み (~74B 回収)。

## 影響

- img blob の受信再送が stale partial を迂回して常に完了するようになった。
- `_imgPending` に保持された shape 参照が、再送時に正しく解決する。
- test.mjs に n-mismatch restart の行動テストを追加 (27 asserts)。
