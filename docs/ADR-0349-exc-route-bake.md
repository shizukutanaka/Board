# ADR-0349: .excalidraw emit — elbow/curve ルートを points に焼き込み

## 状態
承認 — round77

## 背景
conn の exc emit は `_wayArr(s)` (手動 waypoint) のみを points に
出力していたため、elbow の Manhattan 経路・curve のベジエ経路が
excalidraw 側で直線に潰れていた — 視覚情報の消失。

## 決定
`s.elbow` → `_elbowPts(s)`、`s.curve` → `_curveSegs(s)` (16分割
扁平化) のルート点列を points へ焼き込み。往復では exc 側に
経路概念が無いため reimport は `s.way` 付き直線になる — 画素は
保存され意味のみ変化 (受理)。

## 影響
+~140B (522,893B)。bound conn は excalidraw 側が独自ルーティング
するため焼き込みはフォールバック geometry として機能。
2044 全緑。
