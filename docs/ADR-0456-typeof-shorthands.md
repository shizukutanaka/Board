# ADR-0456 — `typeof` 型ガードの shorthand 化

## 状態

実装済 (v1.7.491)

## 背景

wire 検証 (`_attachOp`, `validShape`, `validPatch`, `_mergeSnapshotOp`, msg guard 系) が積み増された結果、`typeof X==='string'/'number'/'object'` の形が **74 箇所**に広がっていた。各サイトは ~21–25 バイトで、単一ファイルの raw サイズ (512KB 緩い上限) を圧迫していた。

## 決定

`_iA=Array.isArray` (ADR-0384) と同じ形で:

- `_iS=v=>typeof v==='string'`
- `_iN=v=>typeof v==='number'`
- `_iO=v=>typeof v==='object'`

を導入し、`typeof E===...`/`!==...` (E は ident/dotted member) を全て畳み込んだ。引数なし呼び出しや `typeof` 単独の利用は残る。

## 影響

- ~933B 回収 (74 sites − 3 defs)。上限までの余白が回復した。
- 意味は完全一致するため test.mjs の literal assert は同 regex を literal 内にのみ適用して同期済み。
