# ADR-0507: `_cpT` copyText+toast shorthand

## 状態

実装済 (v1.7.540)

## 背景

`copyText(...).then(ok=>_tst(t(ok?'copied':'copyFailed'),ok?'ok':'warn'))` の
クリップボード書き込み+結果 toast が 3 サイト (SVG/board JSON/link) に直書き。

## 決定

`const _cpT=p=>p.then(ok=>_tst(t(ok?'copied':'copyFailed'),ok?'ok':'warn'));` に集約。

## 影響

- index.html ~-90B
- 動作変更なし (同一 promise チェーン)
