# ADR-0563: _fragIn は seq===0 で同 src ストリームを再起動する

## 状態
実装済 (v1.7.591)

## 背景
`_fragIn` (snap/opc 共有再組立) は `n`/`src` 不一致でのみ assembly を再起動する
(ADR-0448/0469)。しかし**同一送信元が同じ `n` で再送**した場合、部分組立の
assembly がそのまま残り、`!sn.p[seq]` ガードにより新ストリームの既受信 seq が
拒否される。旧チャンクと新チャンクが混結合し `JSON.parse` で破損 → joiner は
sync-req 再送 (ADR-0475) で回復するが 1 サイクル分の待ちが無駄になる。

送信側が中断し得る経路: `_fragSend` ループ中の `_sendDC` throw (SCTP バッファ
過多) — 部分送信後に次の snapshot で再送すると n/src が一致したまま残る。

## 決定
`seq===0` の到着で assembly を無条件再起動 (`sn={p:new Array(n),g:0,n,src}`)。
全ストリームは seq 0 から始まるため正しく、`_sendDC` 再送キューは FIFO で
順序保持のため正当なストリーム途中での dup seq 0 は発生しない。

## 影響
部分組立中の再送で旧断片が混入しなくなり、snapshot/opc の初回成功率が上がる。
`rtc`/`bc` 両経路に効く (src タグ自体は ADR-0469 で維持)。
