# ADR-0494: `_shV` — 可視図形 subset の集約

## 状態

実装済 (v1.7.527)

## 背景

`_sh().filter(s=>_sv(s))` (非表示図形を除く可視 subset) が fit / select-all /
ctxSelectAll / same-color / same-type / applySnapshot の 6 サイトに複写。

## 決定

`_shV()=>_sh().filter(s=>_sv(s))` に集約 — 選択・測定・スナップ等で一貫して
非表示図形を除外するサブセット名を単語化。

## 影響

- index.html −5B+def (~50B net)
- 動作変更なし
