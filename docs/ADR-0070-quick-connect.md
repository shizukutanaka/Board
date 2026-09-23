# ADR-0070: quick-connect — ホバー図形のエッジ接続点

## 状態

採用 (v1.7.128)

## 背景

コネクタ作成は「ツールバー → line/arrow → 始点ドラッグ → 終点ドロップ」で
手順が長い。draw.io の killer feature: **選択ツールで図形にホバーすると
エッジ中点に接続ドットが出て、そこからドラッグすると結合済みコネクタが
一発で引ける**。フローチャート機能群 (diamond/elbow/curve/rebind/輪郭投影)
の UX を完成させる最後の1ピース。

## 決定

- 選択ツール + `state.hover` (既存の pickTop 追跡、locked/connector 除外)
  の間、オーバーレイに **4辺中点の接続ドット**を描画。hover 変化時は
  `invalidateOverlay()` のみ — ADR-0024 の層分離でシーン再描画コストゼロ。
- ドットの pointerdown (`_qdotAt` ヒット) で `state.draft` に `a:shapeId`
  付きの arrow draft を生成して `dragKind:'qline'` — pointermove で終点
  追従、pointerup は既存 `endLineLike` が両端を `_bindAt` で確定 → `add` op。
- ドット位置は `G.bbox` 4辺中点 (draw.io も四角 bbox 上に出す同等 UX)。
  回転中・ドラッグ中・複数選択中・他ツール中は非表示。

## 断念した代替案

- **全周ポート** (draw.io 式の外向きポート): 4辺中点で実用十分 — 判定
  コストに見合わない。
- **他ツール中も常時ドット**: ペン中などでは視覚ノイズ — select のみ。
- **新規 op 種**: draft→add の既存経路 (endLineLike) がそのまま使える。

## 影響

- 選択ツールで図形ホバー → 4ドット → ドラッグで結合済み矢印一発作成。
- `dragKind:'qline'` は新ドラッグ種だが commit は `add` op — モデル不変。
- 追加の render-only state は不要 — ドットは `state.hover` から毎フレーム
  導出。hover 検出自体は従来から存在 (invalidate 抑止のコメントは overlay
  層化で解消済み)。
