# ADR-0084: コネクタのルートリセット (Clear Waypoints)

## 状態

実装済み (v1.7.142)。

## 背景

ADR-0062 (elbow)、ADR-0068 (curve)、ADR-0072 (bend ドラッグ)、
ADR-0076 (way 中点) でルート編集が増えたが、「直線に戻す」手段が無い。
elbow/curve はトグルで 0 に戻せるが、`s.way` / `s.bend` は undo 以外で
消せず、route をまっさらにするには4箇所を個別に消す必要がある。
draw.io の "Clear Waypoints" が該当する標準機能。

## 決定

- `resetRoute()`: 選択中の line/arrow (未ロック) の
  `way/bend/elbow/curve` をまとめてクリアし直線に戻す。
- 1つの `style` op (`before`/`after` に4キー) で原子化 — undo 一発。
  `way`/`bend` はオブジェクトなので `??null`、`elbow`/`curve` は
  既存の数値フラグ慣例で `0`。
- ctx メニューに `ctxRouteReset` — 選択中にルート編集済み
  (way/bend/elbow/curve のいずれか) のコネクタがある時だけ表示。

## 断念した代替案

- **way/bend を delete**: style op は before/after パッチで動くため
  `null` 代入の方が undo と整合 (delete だと before が持たない
  キーの復元が曖昧になる)。全 reader は truthy 判定で null 安全。

## 影響

- `s.way=null`/`s.bend=null` が新たに生じる — `_linePts`/`connEnds`/
  elbow 生成は全て truthy ガード済みで振る舞いは削除と同等。
