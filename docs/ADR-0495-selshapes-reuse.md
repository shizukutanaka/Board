# ADR-0495: `_selShapes` — zoomToSelection の再利用漏れ

## 状態

実装済 (v1.7.528)

## 背景

`_selShapes()=>_sh().filter(s=>_hasS(s.id))` (選択図形の実体配列) は既存だが、
zoomToSelection の bbox 計算だけが素の `_sh().filter(s=>_hasS(s.id))` を残していた。

## 決定

`_bA(_sh().filter(s=>_hasS(s.id)))` → `_bA(_selShapes())` に置換 — 選択→図形実体の
変換を一箇所に集約。

## 影響

- index.html −16B (523,237 → 523,221)
- 動作変更なし
