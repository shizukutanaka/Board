# ADR-0629: 追い出された parked 図形も blob 到着時に解決

- 状態: 実装済
- 日付: 2026-09-28

## 背景

画像は `s.img` 参照 (key) で wire 上を飛び、bytes は `{k:'img'}` チャンクで別送
される (ADR-0069)。受信側は blob 未到着の図形を `_imgPending` (256 cap, LRU)
に保留し、chunk 完了時に pending を走査して `delete s.img; s.dataUrl=data` と
解決する (8020 行目)。

ADR-0449 の evict で保留エントリが落ちると、対応 blob が届いても解決先が
pending に存在せず、図形は `s.img` を抱えたまま永続プレースホルダーとなる
(img-heavy 盤面や 256 超の並行転送で発生し得た)。

## 決定

blob 到着時に `_imgPending` 走査に加え、盤面 `_sh()` を `s.img===msg.key`
で直接走査して残存参照も解決する。pending はあくまで待機簿であり、
解決の判定は図形自身の `s.img` (唯一の真実) に基づく。

## 影響

- 追い出された parked 図形も blob 到着で確実に解決 — 永続プレースホルダー解消。
- 既存 pending 経路はそのまま (双方向で冗長解決、冪等)。
