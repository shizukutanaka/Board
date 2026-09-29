# ADR-0502: `_idOK` wire id キャップ shorthand

## 状態

実装済 (v1.7.535)

## 背景

wire op の id フィールド検証 `_iS(id)&&_ln(id)<=64` (ADR-0485 で網羅) が
`validOp`/`move`/`group`/`ungroup`/`presence` の 4 サイトに直書きされていた。

## 決定

`const _idOK=id=>_iS(id)&&_ln(id)<=64;` に集約。

## 影響

- index.html ~-40B (4 サイト × ~19B − def ~46B)
- セマンティクスは ADR-0485 の wire キャップ規約と同一
