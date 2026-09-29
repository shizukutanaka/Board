# ADR-0117: コネクタラベル位置ドラッグ (s.labelPos)

## 状態

実装済み (v1.7.174)。

## 背景

エッジラベルは常に経路の弧長中点 (t=0.5) に固定 — draw.io 等では
ラベルをエッジに沿ってドラッグできる。経路が複雑 (way/elbow/
curve) でも中点以外に置けない。

## 決定

- `s.labelPos` (0..1 の弧長パラメータ、未設定=0.5)。
- `_connPathPts(s)` — elbow→`_elbowPts`、curve→16点ベジエ標本、
  他→`_linePts` (way 対応) の統一ポリライン。`_pathAt(pts,t)` /
  `_pathNearestT(pts,p)` が弧長⇄点の相互変換。
- `_connLabelXY` が `labelPos` 有限時に `_pathAt` を優先 — 既定
  経路 (elbow/curve/way 中点ロジック) は不変。
- 単一コネクタ選択時、ラベル位置にドラッグハンドル (accent
  塗りドット)。`dragKind='lblpos'` で生ミューテーション、
  pointerup で `style` op `{id,labelPos}` — undo/同期は既存
  経路。|t-0.5|<0.03 で中点に磁吸。
- SVG export の `_connLabelSVG` 呼出は lp を両端に渡す既存
  イディオムで中点=labelPos に一致。
- `resetRoute` が labelPos もクリア。

## 断念した代替案

- **自由座標 (labelDX/labelDY)**: 経路オフセットは経路変更で
  浮く — 弧長 t は経路変形に追従するため堅牢。
- **垂直オフセットも**: スコープ過大。t のみで実用上十分。

## 影響

- `.board`/共有ペイロードに labelPos が新規プロパティとして
  載る (旧版は無視して中点表示 — 後方互換)。
- `--accent-contrast` UI インジケータが 8→9 箇所。
