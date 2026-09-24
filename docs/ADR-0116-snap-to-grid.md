# ADR-0116: 選択をグリッドに吸着 (ctx「Snap to grid」)

## 状態

実装済み (v1.7.173)。

## 背景

手書き・ペースト・インポートで集まった図形の座標はバラバラ —
整列したい時に一つずつドラッグするしかない。Figma の
「Snap to grid」相当の位置丸め操作が無い。

## 決定

- `snapSelToGrid()` — ctx `ctxSnapGrid`。選択各形状の bbox 左上が
  最寄りの `GRID_SIZE` 倍数に来るよう `Shape.translate` で平行
  移動。**位置のみ** — w/h/way/pts の幾何は変形しない (歪み防止)。
- `align` op `dir:'gsnap'` で before/after 全クローン → 一括 undo・
  リモート同期は既存経路。全員が既にグリッド上なら
  `alreadySnapped` 警告で no-op。

## 断念した代替案

- **w/h もグリッド丸め**: 形状が歪む — Figma 同様、位置のみ。
- **`move` op ×N**: 個別 undo になる — `align` の before/after
  クローン機構が一発 undo に適合。

## 影響

- `state.snap` トグル状態と無関係に動作 (強制吸着)。
- `DIRS` ホワイトリストに 'gsnap' 追加 (test 更新済)。
