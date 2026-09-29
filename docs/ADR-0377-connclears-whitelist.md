# ADR-0377: del connClears パッチを8プロパティのホワイトリストで制限

## 状態
採用 (v1.7.422)

## 背景
リモート `del` op が運ぶ `connClears` (結合清掃デルタ、v1.6.78) は
`_apply` 内で `Object.assign(sh, p.after)` で生きたコネクタに直接適用される。
検証は `validPatch(p.after)` のみだったが、これは**追加キーの存在を禁止しない**:

- `locked:1` — リモートからコネクタをロック (upd/style 系の `noLock` 規約を迂回)
- `type:'rect'` — 生きたコネクタを別型に retype
- `id`/`_x` — 構造キーや内部フィールドの汚染 (`_stripStruct` が適用されない経路)

ローカル生成側 (`computeConnClears`) が運ぶのは `a`/`aF`/`b`/`bF`/`x1`/`y1`/`x2`/`y2`
の8キーのみなので、ホワイトリストで厳密化した。

## 決定
`_CC_KEYS` (8キー) + `_ccOk(q)` を新設し、`validRemotePayload` の `del` 分岐で
`p.before`/`p.after` の全キーが `_CC_KEYS` に含まれることを要求する。

## 断念した代替案
- `_stripStruct` を connClears 適用側に入れる案 — `locked` が `_`/`type`/`id` に
  該当せず素通りするため不完全。かつ `align dir:'lock'` では `locked` が正当なため
  `_stripStruct` 自体を拡張もできない
