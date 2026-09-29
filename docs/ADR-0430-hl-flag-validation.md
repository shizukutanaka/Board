# ADR-0430: `hl` フラグの validPatch 網羅

## 状態
実装済 (v1.7.465)

## 背景
marker ストロークの `s.hl` (highlighter フラグ、ADR-0125) は `add`/`upd`
経路で `_cleanVal` の有限数チェックのみ通り、フラグ prop の型ホワイトリスト
(`bold`/`italic`/`under`/`strike`/`locked`/`shadow`) には未網羅だった。
文字列等の非フラグ値を持つ `hl` がリモート経路で素通りしうる。

## 決定
フラグ型チェックのキーリストに `hl` を追加 — boolean|number のみ許可、
既存フラグと同じ規則。

## 影響
- marker 同期の intake 整合が他フラグと同一水準に。
- `_penCache`/`describeShape` 経路の `hl` 読みは真偽判定のみのため影響なし。
