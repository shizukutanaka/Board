# ADR-0360: .drawio — curve コネクタの制御点 ↔ waypoint 往復

## 状態
承認 — round86

## 背景
`curved=1` は emit/import 双方で扱われていたが、`s.cbend` (手動
ベンド量) は失われ、reimport で自動ボウに戻っていた。

## 決定
- emit: curve 時の `<Array>` waypoint に `_curveCtrl(connEnds,cbend)`
  の制御点を出力 (drawio は curved edge を waypoint 経由で描く)
- import: `s.curve && s.way.length===1` のとき waypoint から法線
  成分を逆算し `s.cbend` に復元 (`cc=mid+n*b` の逆写像、±400 クランプ)、
  s.way は消費して null 化 — Board は curve 時 way を描かないため。

## 影響
+~400B (pair ADR-0361 含む)。custom bend の往復保持。
2044 全緑 (emit アサート追加)。
