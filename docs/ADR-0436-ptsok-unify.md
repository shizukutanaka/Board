# ADR-0436: pen `pts` 検証の統一 (`_ptsOK`)

## 状態
実装済 (v1.7.471)

## 背景
ペン `pts` のタプル検証が2系統で非対称だった:

- `validShape` (add/addMany/import 経路): `p[0]`/`p[1]` の有限性のみ
  → `[x,y,'x']` のような第3要素が任意型の pts が素通り
- `upd` patch 検証 (ADR-0368): 全要素 `typeof n==='number'&&_fin(n)`
  → 同じ pts を `upd` では棄却するのに `add` では通る

## 決定
`_ptsOK(a)` ヘルパに集約 — `_iA(a)&&a.every(p=>_iA(p)&&p.length>=2&&
p.every(n=>typeof n==='number'&&_fin(n)))`。`validShape` と `upd`
の両方が同じ検査を使う (~20B も回収)。

## 影響
- `add`/`addMany`/import 経路でも `pts` 要素の型を網羅 — 非数値の圧力値
  (drawPen の `size*p[2]` → NaN セグメント) を棄却。
- `way` は `{x,y}` オブジェクト形式 (ADR-0361) で別構造のため対象外
  (既に validPatch 側で網羅済み)。
