# ADR-0380: describeShape にグループ所属とコネクタ結合先のアナウンス

## 状態
採用 (v1.7.425)

## 背景
`describeShape` は type/テキスト/座標/lock/hidden/rotate/link を読み上げるが、
視覚的には明白な2属性が SR チャネルに欠けていた:

- `s.groupId` — キャンバス上ではハローで示される所属関係
- `s.a`/`s.b` (コネクタ結合先) — 結合ドットで示される「何を結んでいるか」。
  コネクタのアイデンティティの中核なのに SR には「Arrow @ x,y」としか届かない

## 決定
`describeShape` に2行追加:

- `s.groupId` → `t('tagGroup')` (ja '(グループ)' / en '(grouped)') — `tagHidden` の先例
- `_conn(s.type)&&(s.a||s.b)` → `t('srBound'): <typeA>→<typeB>` (ja '結合' / en 'bound')
  — 端点名は `T.k` のロケール名 (`describeShape` 冒頭と同じ経路) に限定し、
  再帰的な describeShape 呼出はしない (循環結合で無限再帰する危険があるため)

## 断念した代替案
- 結合先の describeShape 全文を再帰する案 — A→B→A の循環結合で無限再帰
