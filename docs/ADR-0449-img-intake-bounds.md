# ADR-0449: img 受信ストアの上限化 (`_imgIn` / `_imgChunks`)

## 状態
実装済 (v1.7.484)

## 背景
img blob 受信パイプラインに2件の無制限化:

1. **`_imgIn` (受信済み blob ストア) が一切 delete/clear されない** —
   blob は ref より先に着いてよい設計上 keep が必要だが、consume 後も
   他 shape 共有 (content-hash dedup) のため保持し続け、セッション中
   **受信 blob 数だけ無制限に増長**していた。
2. **`_imgChunks` (組立中 assembly) の 64 件 cap が新規 key を拒否** —
   64 個の未完 key を開いたままにするピアで、その後の画像転送が
   **永続的に全 drop** される DoS 面。

## 決定
- `_imgChunks`: cap 到達時に最古 stalled key を eviction して新規 key を
  受け入れ (未完送りっぱなしの key が勝つ)。
- `_imgIn`: cap 256 で最古 eviction。evict された blob が必要な ref は
  `_imgPending` に残り、次 snapshot の全 blob 再 put (ADR-0069 fresh
  sent-map) で再解決するため機能害なし。

## 影響
- 長時間セッションのメモリリーク解消 + stalled-key DoS の緩和。
  行動テストで両上限を assert (24 asserts)。
