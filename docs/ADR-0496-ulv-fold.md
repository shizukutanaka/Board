# ADR-0496: `_ulv` — unlocked+visible 判定の集約

## 状態

実装済 (v1.7.529)

## 背景

`!_lk(s)&&_sv(s)` (編集可能かつ表示されている図形) が marquee select / Tab 全選択 /
invert selection / lasso-able 判定の 4 サイトに複写。

## 決定

`_ulv=s=>!_lk(s)&&_sv(s)` に集約 — ポインタ/キーボードがたどり着ける図形の
語彙を一語化 (既存 `_selUL` と対称)。

## 影響

- index.html ~+45B gross→net ~-9B (def コストを差し引いて微減)
- 動作変更なし
