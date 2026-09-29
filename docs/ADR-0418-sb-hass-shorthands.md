# ADR-0418: `_sb()`/`_hasS()` shorthand fold

## 状態
実装済 (v1.7.453)

## 背景
選択オブジェクト取得 `_selIds().map(byId)` が 10 サイト、選択所属判定
`_sl().has(id)` が 7 サイト — 共に predicate/変換パターンとして
helper 化すれば記述が短く意図が明確になる。

## 決定
- `_sb()` — `_selIds().map(byId)` (10 サイト)。`_selL` 自体も
  `_sb().filter(f)` に畳み込み。
- `_hasS(id)` — `_sl().has(id)` (7 サイト)。

## 影響
- 純リファクタ (~90B 回収) — 挙動は不変。
- `byId` の live-lookup 経路が helper 化され、将来 Map 化する場合の
  変更点が `_sb`/`_hasS` の内部だけになる。

## 断念した代替案
- `_iv();_o(m)`/`_aS();_iv()` の fold: 定義コストに対し各サイトの
  節約が小さく赤字 — 見送り。
