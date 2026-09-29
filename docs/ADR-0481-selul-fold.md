# ADR-0481: `_selUL` unlocked-selection shorthand

## 状態

実装済 (v1.7.514)

## 背景

`const sel=_selL(s=>s&&!_lk(s))` (選択中の非ロック図形リスト) が doDelete/doFlip/
doAlign 等 5 サイトで同型に現れていた。`_selL(f)` は `_sb().filter(f)` の shorthand
だが、unlocked 限定は十分頻出なので専用 helper に畳む。

## 決定

`const _selUL=()=>_sb().filter(s=>!_lk(s))` を shorthand 表に追加し 5 サイトを fold。
`_selUnl` (ADR-0454) との役割分担: `_selUnl(f)` は「条件に合う非ロック図形が**存在するか**」
(predicate)、`_selUL()` は**リストを返す**。

## 影響

- index.html +22B (def 追加、fold 分との相殺後) — 純粋に idiomatic 集約
- 動作変更なし
