# ADR-0047: グループハローの `_gridVer` 連動キャッシュ

- 日付: 2026-09-23
- 状態: 承認
- 関連: ADR-0016 (空間索引), ADR-0020 (スナップ索引), ADR-0025 (minimap キャッシュ),
  ADR-0032 (grid hit-testing), ADR-0041 (DOM mirror)

## 背景

`drawOverlay()` はフレームごとに `Map<groupId, shapes[]>` を全形状走査で
構築していた。overlay 層は ADR-0024 で分離済みのため、マーキー選択のドラッグ
(pointermove ごと)、ピアカーソル、選択ハイライト更新のたびに O(n) の Map 構築
が走る。5000 形状の盤面でマーキースクラブ中に毎フレーム全件走査は無駄。

グルーピング構造は `groupId` のみに依存し、groupId は `group`/`ungroup` op
経由でしか変わらない — つまり `_gridVer` と完全連動する (全 op commit が
`_invalidateGrid()` を通る)。shape の座標変異 (translate 等) は参照で追うため
マップ内容に影響しない — bbox は毎フレーム `G.bboxAll` で取り直す設計のまま。

## 決定

`_grpMapGet()` — `_gridVer===_grpMapVer` なら既存 Map を返し、違えば再構築。
ADR-0020 の `_snapIdx` / ADR-0041 の `_mirrorVer` と同一イディオム。

## 断念した代替案

- **bboxAll 結果までキャッシュ**: translate はメンバー shape を in-place 変異
  するため、グループ bbox は変わり得る。構造のみキャッシュして bbox は毎回
  再評価 (ペン以外は O(1)、ペンは ADR-0019 でメモ化済み)。
- **op 適用時のイベント駆動無効化**: `_gridVer` が既に「全変更の共通キー」
  として機能しており、別チャンネルを足す意味がない。

## 影響

- `drawOverlay` の全件走査が除去 — overlay-only リペイントが O(groups) に。
- test.mjs: presence check (`_grpMapGet`/`_grpMapVer`/`_gridVer` 連動) を追加。
