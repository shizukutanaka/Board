# ADR-0374: 画像チャンク経路の容量上限

## 状態
承認 — round97

## 背景
- `_imgPending` (blob 未到着の parked shape ref) が無制限 — slim ref を
  大量に送って chunk を送らずに切断するピアで待ち列が無限成長。
- `_imgChunks` (in-flight 再組立) も無制限 — 数千キーを開いて未完のまま
  にすれば Map が膨張。既存の `n≤4096`/`data` 12MB 上限はキー数を
  カバーしない。

## 決定
- `_imgPending` ≤256 — 上限到達で最古エントリを evict (Map 挿入順)。
- `_imgChunks` ≤64 keys — 上限超過は新規 key を drop (未完分は破棄、
  後続キーで再開始可能)。
- `_imgIn` は将来参照のため維持 (chunk 1回送信のみの wire 仕様で、
  resolve 後 evict は遅れて届く ref を永久 park にする)。

## 影響
2044 全緑。
