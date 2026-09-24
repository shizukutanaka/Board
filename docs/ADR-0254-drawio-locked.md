# ADR-0254: drawio locked ↔ editable/deletable/movable=0 往復

## 状態
承認 — round37

## 背景
drawio に総合 `locked` フラグはなく、`editable`/`deletable`/`movable`/
`resizable`/`rotatable`/`connectable` の個別ロック style キーで表現する。
Board の `s.locked` はそれら全部を兼ねるので部分集合で往復する。

## 決定
- export: vertex `editable=0;deletable=0;movable=0;resizable=0;`、
  edge `editable=0;deletable=0;movable=0;` (edge に resizable 概念なし)。
- import: `editable`/`deletable`/`movable` のいずれかが `0` → `s.locked=1`
  (vertex+edge 両ループ)。`connectable=0` のみは接続不可であって移動
  可能 — Board のロック意味論に含まないためトリガに入れない。

## 断念した代替案
- 個別キーを別 prop に分離 — Board のロックは一括なので過剰。

## 影響
ロック状態が drawio 往復で保持。1964 全緑。
