# ADR-0493: `_rs` — 盤面総取替えイディオムの集約

## 状態

実装済 (v1.7.526)

## 背景

`state.shapes=X;_iG();_pcC();` (全 board swap: 配列代入 + grid invalidation +
per-shape cache purge) が importBoard / importFromHash / applySnapshot /
restoreBackup / .excalidraw import の 5 サイトに複写。

## 決定

`_rs(arr)=>{state.shapes=arr;_iG();_pcC()}` に集約 — インポート/復元/スナップ
適用の取替えパスを一括で表現。`state.shapes=` への書き込みを単一 helper 経由に
集約することで、将来の盤面取替え時に必ず cache purge が伴うことが型で保証される。

## 影響

- index.html −41B (523,242 → 523,201+def)
- 動作変更なし
