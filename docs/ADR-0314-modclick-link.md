# ADR-0314: ⌘/Ctrl+click で図形リンクを開く

## 状態
承認 — round51

## 背景
`s.link` (ADR-0301/0304) は ctx メニュー「リンクを開く」のみ到達可能で、
Figma/Notion 慣例の mod+click 直接オープンがなかった。

## 決定
select ツール pointerdown で `/Mac|iPhone|iPad/` なら `metaKey`、
それ以外は `ctrlKey` + click ヒットの `s.link` を `window.open(…,'_blank','noopener')`。
(macOS の ctrl+click はコンテキストメニュー和音のためプラットフォーム分岐)

## 断念した代替案
- metaKey||ctrlKey 一括 — macOS で ctx メニューと競合。
- ホバー中のリンクアイコン表示 — chrome の常時描画増になるため
  キーボード修飾の既存パターンに合わせた。

## 影響
リンク開放が1アクションに。2021 全緑。
