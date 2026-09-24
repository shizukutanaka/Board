# ADR-0144: Alt+click でカーブを自動ボウへ

## 状態

実装済み (v1.7.201)。

## 背景

ADR-0132 の apex ドラッグで手動 `s.cbend` を付けた後、自動
(弦長 25% のボウ) に戻す手段がルートリセットのみだった。
ADR-0141/0143 の「⌥click = ルート修整の個別解除」パターンを
カーブにも適用して文法を完結させる。

## 決定

- 選択中 curve の apex への Alt+pointerdown はドラッグ開始では
  なく `s.cbend` 削除 → `_curveCtrl` の自動計算に復帰。
  style op → undo 一発。
- `cbend` が無い時は従来通りドラッグ開始。

## 断念した代替案

- **dblclick**: ラベル編集との衝突 (ADR-0141 と同じ判断)。

## 影響

- waypoint (0141) / elbow bend (0143) / curve cbend (本ADR) の
  3つのルート修整が同一修飾子で統一 — 学習コスト最小。
