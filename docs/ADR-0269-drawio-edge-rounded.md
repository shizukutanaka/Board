# ADR-0269: drawio edge rounded=1 → s.r 受容

## 状態
承認 — round39

## 背景
edge export は `s.r` → `rounded=1` を書き出すが、import の `sty.rounded`
処理は vertex loop にしかなく edge loop は未読 — エルボー角丸
(ADR-0207) が drawio 往復で失われていた。

## 決定
edge loop の `_dioStyApply` 直前に `if(sty.rounded==='1')s.r=8;`。
vertex 側の `s.w!=null` ガードは既存を維持 (conn は w/h を持たない)。

## 断念した代替案
- `_dioStyApply` 内に rounded を追加 — sticky/note まで r を得てしまい
  意味が広がる。edge 専用に局所化。

## 影響
エルボー角丸が drawio 往復で保持。1976 全緑。
