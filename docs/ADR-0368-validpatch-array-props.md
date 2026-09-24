# ADR-0368: validPatch `pts`/`way` 配列構造チェック

## 状態
承認 — round92

## 背景
`validShape` の `pen.pts` 要素チェック (Array+finite x,y) は shape 全体
の生成経路のみ — `upd` パッチは `validPatch` 単独で通過するため、
crafted `{pts:[["x"]]}` / `{way:[{x:'a'}]}` がレンダラへ NaN として
到達する経路が残っていた (v1.7.49a は flat/nested の区別のみ)。

## 決定
- `p.pts`: `Array.isArray && length≤50000 && every [finite x, finite y,
  optional finite p]` (`pts:[]` は v1.7.49a で許容済みのため length>0 は
  要求しない — upd での空配列は合法)。
- `p.way`: `Array.isArray && length≤200 && every {x,y} finite` —
  tuple 形式は ADR-0361 以降 object 形式のため reject。

## 影響
2044 全緑。test.mjs に ADR-0368 ブロック追加。
