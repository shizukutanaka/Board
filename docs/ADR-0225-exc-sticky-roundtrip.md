# ADR-0225: excalidraw sticky の往復 (containerId fold)

## 状態

実装済み (v1.7.282)。

## 背景

sticky は excalidraw に「rectangle + 独立 text」ペアとして
出力されていたため、再インポートで2つの無関係な図形に
分解された — sticky が往復で消滅していた。

## 決定

excalidraw 本来のコンテナモデルを利用:

- **export**: sticky の text 要素に `containerId:<rect id>`
  を付与し、rect の `boundElements` に `{id,type:'text'}`
  を追加 (ADR-0222 の conn バインドと併記)
- **import**: `containerId` を持つ text を検出 → 親 rect
  が label を持たなければ `type='sticky'` に変換して
  `text`/`fontSize` を吸収、`fill` は `color` に写し、
  孤立した text 形状を除去

## 断念した代替案

- 独自のメタフィールド (`stickyId` 等) でリンク:
  containerId は excalidraw が認識する公式フィールドで、
  本物の excalidraw で開いても「コンテナ内テキスト」と
  正しく表示される。公式を採用した。

## 影響

- sticky が .excalidraw 往復で完全に保存される。
- 親が `label` を持つ場合は fold しない (矩形+ラベルの
  正当ペアを誤吸収しない)。
