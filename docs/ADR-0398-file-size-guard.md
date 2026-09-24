# ADR-0398: ファイル取込 32MB 上限

## 状態
実装済 (v1.7.436)

## 背景
`.board`/`.excalidraw`/`.svg`/`.drawio` の 4 つの FileReader 経路はファイルサイズを
一切検査していなかった。数百 MB のテキストファイルを開くと `JSON.parse`/XML parse が
メインスレッドで長時間ハングする (タブの強制終了しか回復手段がない)。ペイロード系の
既存 cap — `dataUrl` 16M、snap 結合 24M、`SHARE_MAX_SHAPES` — と同系統の穴。

## 決定
`const _bigFile=f=>f.size>33554432` を定義し、4 つの reader 冒頭で
`invalidBoard` トースト付きで早期 return。32MB は大きなボード JSON を十分に
カバーしつつ parse ハングを防ぐ実用的な線。

## 断念した代替案
- `FileReader` を worker 化して parse を裏スレッドへ — 単一ファイル制約に反する。
- `.board` のみ上限 (他は対象外) — SVG/drawio も XML parse が同様にハングするため
  4 経路全部に適用。
