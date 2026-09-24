# ADR-0063: 双方向矢印 (始点側ヘッド)

## 状態

採用 (v1.7.121)

## 背景

Board の arrow は終点側のみヘッドを描く。図解では「双方向」の表現が頻出 —
相関・対称関係・距離寸法・双方向通信。Excalidraw は `startArrowhead` を
サポート (arrow/dot/bar/none)、draw.io では「⇄」が主要スタイル。
Board では現状、2本の矢印を重ねるしか手段がない。

## 決定

arrow に `s.start` (truthy で始点側ヘッド、`0`/未定義 = 終点のみ —
`elbow`/`dash` と同じ規約) を追加:

- 始点側ヘッドの角度は**始端セグメントの逆方向** — 直線は `ang+π`、
  elbow は `_elbowPts` の `pts[0]→pts[1]` 方向 (stub の内向き = 図形へ
  向かう向きの逆、すなわち外向きを向く)。
- 肘経路との合成は自然に動作 — elbow で始端ヘッドは stub 法線に垂直に
  図形へ向かう向きになる。
- コンテキストメニュー `ctxBothEnds` で選択中の arrow を個別トグル、
  `style` op (before/after `start`) 記録 — undo/同期/LWW が既存経路。
- SVG 出力: `<line>`/`<polyline>` + 始点側・終点側 `<polygon>` ヘッド。

## 断念した代替案

- **`startArrowhead` スタイル選択** (none/arrow/dot/bar の4択): Excalidraw
  parity だが UI がセレクトボックス化する。scratchpad には boolean トグルで
  十分 — dot/bar が必要になれば `s.start` を数値化して拡張可能。
- **新 shape 型 `arrow2`**: 型が増えると全経路 (hit/draw/export/duplicate)
  の分岐が増える。prop トグルは ADR-0062 と同じ理由で選択。
- **line にもヘッド**: line はヘッドを持たない型の定義 (コネクタ=接続線、
  arrow=方向)。両端にヘッドが要るものは arrow が担う。

## 影響

- 選択した arrow をコンテキストメニュー「両端ヘッド」で双方向化 / 解除。
- 旧版 Board では `start` は無視され終点のみヘッド (graceful)。
