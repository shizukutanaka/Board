# ADR-0275: drawio export に compressed="false" を明記

## 状態
承認 — round40

## 背景
drawio の標準保存は `<diagram>` 内を deflate+base64 に圧縮する。
Board の export は非圧縮 XML を直接格納しており、drawio 側は内容で
判別するが、`mxfile` の `compressed` 属性を省略したままだった。

## 決定
export ヘッダに `compressed="false"` を明示 — 判別を属性優先する
ツールでも正しく非圧縮として認識される。

## 断念した代替案
- 圧縮 export (CompressionStream) — drawio 側の圧縮期待と整合するが、
  非圧縮は人間可読・diff 可能・他ツールとの互換で優れる。

## 影響
export ファイルが drawio/その他ツールで非圧縮と明示認識。1982 全緑。
