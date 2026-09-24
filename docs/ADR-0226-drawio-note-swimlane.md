# ADR-0226: drawio note/swimlane → sticky/frame の逆マップ

## 状態

実装済み (v1.7.283)。

## 背景

ADR-0220 のエクスポートで sticky→`shape=note`、frame→
`swimlane` に変換したが、インポート側は両方を一般の
rect として読んでいた — 往復で sticky/frame が消滅。

## 決定

`drawioToShapes` の vertex 分岐に追加:

- `shape=note` → sticky (`fillColor` を `color` へ写し、
  `value` は text — note はラベル面がテキスト面なので)
- `swimlane` (style キー存在 or shape=swimlane) → frame
  (`value` は label)

## 断念した代替案

- `swimlane` の子要素を frame contents として復元: drawio
  では swimlane 子は parent 参照で管理されるが、export 側
  は parent=1 で出すため往復では発生しない。真の
  drawio ファイル由来の swimlane 子は独立図形として
  落ちる — 許容範囲。

## 影響

- drawio↔Board の vertex 往復が全型で完結
  (rect/ellipse/diamond/text/note/swimlane)。
