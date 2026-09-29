# ADR-0160: WebRTC 招待トークンの近代化 (escape/unescape 廃止)

## 状態

実装済み (v1.7.218)。audit-2026-06 §3 残課題を消化。

## 背景

`_encodeToken`/`_decodeToken` (コピペ手動シグナリングの SDP
トークン) は `btoa(unescape(encodeURIComponent(...)))` の廃止
済みパターンを使用 — 非 ASCII バイトを3倍に膨張させ、
`unescape`/`escape` は非推奨 API。

## 決定

- エンコード: `_b64uEnc(TextEncoder(JSON))` — 既存の UTF-8
  安全 base64url ヘルパー (`z:`/`img` ペイロードと同一)。
- デコード: `_b64uDec` → UTF-8 JSON を先に試行し、失敗時は
  旧 `atob+escape` 形式へフォールバック — 旧版で発行済みの
  招待トークンも受理。
- URL セーフな base64url のため `#s=<token>` リンク
  (ADR-0045) でもそのまま使える (従来 `+/=` が混入し得た)。

## 断念した代替案

- **CompressionStream で deflate**: 非同期化が必要で接続 UI の
  同期フローを複雑化 — SDP は ~1-3KB ASCII で効果薄。

## 影響

- トークン表現のみ。新旧ピア間の互換はデコーダのフォール
  バックで保持。
