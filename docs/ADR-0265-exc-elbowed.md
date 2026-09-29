# ADR-0265: excalidraw elbowed ↔ s.elbow 往復

## 状態
承認 — round39

## 背景
excalidraw の矢印は `elbowed:true` で直角エルボー配線を持つ。
従来 import は points の中間点を `s.way` に落とすのみ (見た目は
復元されるが経路型は「直線+ウェイポイント」で、trunk ドラッグ等の
elbow 操作が効かなかった)。

## 決定
- import: `e.elbowed` → `s.elbow=1` (way[] は引き続き経路を保持)。
- export: `s.elbow` → `elbowed:true` を要素に追加 (arrow/line 双方)。

## 断念した代替案
- way[] を elbow 判定に流用 (中間点が直角配置なら elbow と推定) —
  ユーザーが手で引いたウェイポイントを誤認するため据置き。

## 影響
エルボーコネクタが excalidraw 往復でルート型を保持。1972 全緑。
