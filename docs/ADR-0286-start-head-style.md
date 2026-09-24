# ADR-0286: 矢印開始ヘッドの独立スタイル s.startHead

## 状態
承認 — round43

## 背景
`s.start` は真偽値のみで開始ヘッドは終端と同じ `s.head` 語彙を共有。
drawio の `startArrow=oval|diamond` (UML 集約で多用) や excalidraw の
`startArrowhead` が往復で失われていた。

## 決定
`s.startHead` ∈ dot|open を追加 (未設定時は従来通り `s.head` を継承)。
- canvas 3箇所 + SVG 5箇所の開始ヘッド描画で `s.startHead||s.head`。
- drawio import: `startArrow` oval/diamond→dot、open→open、他→既定。
- drawio export: `startArrow=` oval|open|classic。
- exc import/export: `startArrowhead` ↔ `s.startHead||'arrow'`。

## 断念した代替案
- UI で開始ヘッドを個別編集可能にする — ctx メニュー拡張が大きく、
  まず round-trip 保持のみ (表示は正しく行われる)。

## 影響
diamond 開始ヘッド等の drawio/UML 図が正しく表示・往復。1992 全緑。
