# ADR-0072: エルボーコネクタの trunk ドラッグ (bend 位置調整)

## 状態

採用 (v1.7.130)

## 背景

ADR-0062 の elbow ルートは自動計算のみ — 中間 trunk セグメントの位置は
常に終端スタブ側に寄る固定値で、draw.io のように「ルートの中間区間を
ドラッグして位置を調整」できない。

## 決定

- `s.bend` (数値) を elbow 図形の新プロパティとして導入 — trunk セグ
  メントの「支配軸」座標を保持 (水平スタブ系では trunk=垂直線の x、
  垂直スタブ系では trunk=水平線の y)。`null`/未設定 = 従来の自動位置。
- `_elbowPts` は `s.bend!=null` 時、trunk を `bend` 座標の2コーナー
  経路 `[p1,q1,{bx,q1y},{bx,q2y},q2,p2]` に変更 (自動時は従来の単一
  コーナーを維持し視覚退行を避ける)。
- 選択中の elbow 図形 (単一選択) で trunk セグメント上の pointerdown
  を `dragKind:'ebend'` に解決 → ドラッグで `s.bend` をライブ更新 →
  pointerup で `{op:'style',bend}` を commit (undo/LWW 同期は既存枠組)。
- 選択中の trunk 中点に小さな四角ハンドルを overlay 描画し発見性を確保。

## 断念した代替案

- **絶対 waypoint 配列 (draw.io式)**: 任意多点ルートは柔軟だが `a/b` 結合
  追従・hit・SVG・ラベル全経路の改修量が大きい。trunk 一本の制約で十分。
- **bend をオフセット量で保持**: 結合図形の移動で trunk が相対追従する
  利点があるが、「ユーザが見た絶対位置」からずれる違和感が大きい —
  draw.io 同様に絶対座標保持。
- **ダブルクリックで bend リセット**: 触知性が低く事故りやすい —
  `toggleElbow` 往復でも bend は保持され、要望があれば将来追加。

## 影響

- `_elbowPts` の trunk 分岐 + INPUT 1 dragKind + overlay ハンドル。
  `s.bend` は shape プロパティとして既存の永続化・共有・sync 経路に乗る。
- 自動ルートは不変 — `bend` 未設定の全既存 elbow は見た目同一。
