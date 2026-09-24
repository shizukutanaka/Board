# ADR-0274: drawio shape=cylinder/cloud → ellipse 近似受容

## 状態
承認 — round40

## 背景
drawio の `shape=cylinder` (DB円筒) / `shape=cloud` は Board に型がなく
default rect へ落ちていた。どちらも視覚的には楕円系が近似。

## 決定
vertex の型分岐で `ellipse` キーまたは `shape=cylinder|cloud` を
ellipse にマップ。他の未対応 shape (parallelogram 等) は従来通り
rect + label で受容。

## 断念した代替案
- 専用の円筒/雲パスを自前実装 — 使用頻度に対し描画・選択・export の
  全経路の拡張コストが見合わない。

## 影響
DB図・クラウド図の drawio 取り込みで形状が近似保持される。1981 全緑。
