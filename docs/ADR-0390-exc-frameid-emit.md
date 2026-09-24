# ADR-0390: .excalidraw 書き出しで `frameId` を空間内包から付与

## 状態
実装済 (v1.7.432)

## 背景
Board の frame メンバーシップは `withFrameChildren` と同じく**純粋に空間内包** —
子 shape が frame の bbox に完全に収まるときのみ member 扱い。一方 Excalidraw の
`frameId` は要素側が持つ**明示的な紐付け**で、従来 emit では書き出していなかった。
そのため Board → Excalidraw で「frame をドラッグすると中身が追従する」関係が
輸出先で失われていた。

## 決定
`excScene` の最終段で、全 frame について `withFrameChildren` と同一の内包判定を
行い、内包される shape の element に `frameId` を書き出す。frame 自身には付けない
(入れ子は Board 側でも非対応)。bound ラベル text (`containerId` 経由) も container の
`frameId` を継承する。import 側は変更不要 — 空間内包で自動再導出される。

## 断念した代替案
- `s.frameId` フィールドを新設して明示紐付けにする案 — Board の空間モデルと矛盾し、
  `withFrameChildren` 系の全経路を改修する必要があるため不採用。
- 内包境界を半分重なりで判定する案 — `withFrameChildren` と食い違い不採用。
