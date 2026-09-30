# ADR-0844 — img/wire サブシステム監査完走の記録

## Context

ADR-0031/0069 の画像 blob 分離以降、wire 経路・永続化・パッチ適用と
参照が増殖した。0374〜0843 の一連の ADR で各経路を監査済みのため、
ここに完走状態を記録する。

## 監査結論 (完走)

- **受信**: `_imgChunks` (256件+n不整合restart+64KB/slot+集計24MB+60s TTL)、
  `_imgIn` (256件/64MB) — 全て件数ではなくバイトでも縛る (0778–0786)
- **送信**: `_imgOuts` (drain 経路・部屋切替クリア)、`_imgSent` (64MB、0842)
- **駐車**: `_imgPending` (256-cap+60s失効)、`_park` 単一イディオム —
  wire whole-shape・IDB load・IDB restoreBackup・全パッチ適用 (`_oa`)・
  undo 復元の5経路全てで dangling `img:` を駐車 (0835/0840/0841/0374)
- **修復**: parked 参照は imgq 再要求 (`_bcast`、0837) + straggler 走査
  (0629) + blob 到着時 live-ref ゲート解決 (0747)
- **応答**: imgq は `_imgIn`||`_imgSent` の O(1) Map 参照 + 10s/key スロットル
  (0835/0836) — 攻撃的 imgq フラッドに耐える
- **join 経路**: sync-req 有界再送 (0475)、応答者選出 (0465)、
  snapBig 時 RTC 閉鎖で joiner へ正直な disconnected (0843)

残存なし。`_imgCache` (60件 LRU) は描画キャッシュで wire 状態ではないため範囲外。

## Test

- 既存ピン群 (0629/0630/0752/0753/0835/0836/0840/0841/0842) が全経路を固定
