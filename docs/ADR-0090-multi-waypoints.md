# ADR-0090: 複数ウェイポイント (multi-vertex straight connectors)

## 状態

実装済み (v1.7.148)。

## 背景

ADR-0076 の `s.way` は単一頂点のみ。draw.io/Excalidraw の直線
コネクタは任意数の中間点を持てる — 複雑な回避経路には必須。

## 決定

- `s.way` を `{x,y}` 単体から **`[{x,y},…]` 配列**へ格上げ。
  `_wayArr(s)` が読み側を正規化 (旧 object 形式の盤面/ops も
  そのまま読める — 初回書き込み時に配列へ正規化される)。
- `_linePts` は全頂点を挿入。ヒット・bbox・矢印角度・ミニマップ・
  SVG・ラベルは `_linePts`/`_wayArr` 経由で自動追従。
- 選択中ハンドル: 各頂点にドット + 各セグメント中点にドット。
  中点ドラッグはそのセグメント位置へ新規頂点を挿入
  (`ptr.wayIdx` + `ptr.wayNew`)、既存頂点ドラッグは移動、
  中点へ6pxで頂点削除 (空になれば `s.way` 自体を削除)。
- `_connLabelXY` は全セグメントの総延長の中点をラベル位置に。
- 全変換 (translate/flip/rotate/gresize/_mapToBox) は全頂点を写像。

## 断念した代替案

- **`s.ways` 新プロパティ併設**: 二重ソースは ops/LWW で破綻する。
  同一キーの配列化 + `_wayArr` 正規化が一番安全。
- **elbow への多頂点拡張**: elbow は自動経路、bend (trunk) で
  手動調整済み。直線 way の多頂点化とは別関心事。

## 影響

- `s.way=[]` (空配列) は永続化しない — 全頂点削除で `delete s.way`。
- `resetRoute`/ctxRouteReset は `s.way` の truthy 判定を
  `_wayArr(s).length` に (空配列は truthy なため)。
