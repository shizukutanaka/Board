# ADR-0483: `_repC` — replace-op commit の集約

## 状態

実装済 (v1.7.516)

## 背景

`Store._recordCommitted({op:'replace',before,after:clone(_sh()),wc:beforeWc,
afterWc:clone(_wc()),origSel})` が 3 箇所 (IDB load 採用・全消去・import 採用) に
同一形式で複写されていた。

## 決定

`_repC(before,beforeWc,origSel)` に集約 — `after:clone(_sh())` と `afterWc:clone(_wc())`
は常に「現在の全図形/クロック」なので helper 内部で評価し、呼出し側は before 系のみ渡す。

## 影響

- index.html −79B (523,486 → 523,407、余白 ~880B)
- 動作変更なし
