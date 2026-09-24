# ADR-0102: 選択をフレームで包む (⌘⌥G)

## 状態

実装済み (v1.7.160)。

## 背景

「選択 → フレーム化」は Figma の `⌘⌥G` でおなじみの操作。
Board のフレームは空間包含 (メタ情報なし) なので、選択群の
union bbox + padding を覆うフレームを作るだけで機能が完結する。

## 決定

- `wrapInFrame()` — `G.bboxAll(sel)` +16px pad の frame を
  `add` op で生成、選択をフレームへ置換。z は `min(member.z)-0.5`
  (ADR-0001 の分数 z で安定順序) — 中身を覆わない。
- キーバインドは `e.code==='KeyG'` — macOS では ⌥ で `e.key` が
  `'©'` に化けるため `k==='g'` では到達不可。
- ctx メニュー `ctxWrapFrame` も追加。

## 断念した代替案

- **`⌘⇧F` 等の別キー**: Figma 慣習 `⌘⌥G` を採用 (e.code で回避可能
  と判明)。

## 影響

- 空フレーム選択時は `selectTwo` トースト (doGroup と同じ警告流用)。
- ロック形状は除外 (doGroup parity)。
