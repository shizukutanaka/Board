# ADR-0379: 画像チャネル/dataUrl の長さ上限

## 状態
採用 (v1.7.424)

## 背景
ADR-0374 で `_imgPending`(≤256)/`_imgChunks`(≤64) の**件数**を制限したが、
**各要素の長さ**は無制限のままだった:

1. `img` チャンク `msg.data` — 型チェックのみ。結合後 12MB 上限は全パーツ着信
   後にしか走らないため、4096 slot × 巨大文字列 × 64 キーのバッファ確保が可能だった
2. `dataUrl` — string リストの長チェックから明示的に除外されており、
   `/^data:image\//` 形式ゲートのみ。add/upd/snapshot/import 経由で巨大文字列が
   `getImg` → `img.src` へ直行し得た

## 決定
- `msg.data` ≤ 96KB (ワイヤ形式 ~64KB の 1.5 倍マージン) — 超過チャンクは
  `_imgChunks` にバッファされる前に棄却
- `p.dataUrl` ≤ 16,000,000 文字 (base64 ~12MB、ワイヤ結合上限 12MB に整合) —
  validPatch 統合ゲートで add/upd/snapshot/validShape を一括カバー

## 断念した代替案
- `n`(チャンク総数)を 64KB × 12MB = ~187 に厳密一致させる案 — 将来のチャンク幅
  変更に脆い。件数上限 4096 のまま per-chunk 長で実質制限する方が頑健
