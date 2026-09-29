# ADR-0076: 直線コネクタの中間ウェイポイント

## 状態

採用 (v1.7.134)

## 背景

line/arrow は始終点のみ — draw.io では直線ルートの中点をドラッグして
中間ウェイポイントを作り、図形を迂回させられる。elbow/curve には経路
制御 (ADR-0062/0068/0072) があるが、単純な2点線は折れを表現できない。

## 決定

- `s.way={x,y}` (単一ウェイポイント、world 座標) を line/arrow に追加。
  `_linePts(s)` = `[p1, way?, p2]` を draw/hit/bbox/SVG/minimap/label の
  共通経路源とする。
- UX (draw.io parity): 単一選択中の straight connector (elbow/curve 無し)
  で、線分中点 ±tol の pointerdown を `dragKind:'way'` に解決 → `s.way`
  をライブ更新 → pointerup で `style` op commit。waypoint があれば
  その位置がハンドルになる (同じ命中で掴める)。
- **ドラッグで直線中点 ±6px に戻すと `s.way` を削除** (self-cleaning —
  専用の削除操作を要しない)。
- Transform: `s.way` は x1/y1/x2/y2 と同じ world 点として translate /
  flip / rotate / gresize / grot の全経路で変換。
- elbow/curve との排他: way は straight 描画経路でのみ参照されるので、
  elbow トグル中は休眠 → 直線に戻すと復活。トグル op には含めない。

## 断念した代替案

- **多点ウェイポイント配列**: 単一点でフロー図の迂回は十分 — 多点は
  hit/drag/undo の複雑さが跳ね上がる。
- **ダブルクリックで追加/削除**: 発見性が低い。中点ドラッグは直感に合う
  (draw.io/Excalidraw の挙動)。
- **中点ハンドル常時表示**: 選択中のみホバーで十分 (常時描画は画面を
  散らかす)。

## 影響

- `s.way` は shape プロパティとして永続化・共有・sync の既存経路に乗る。
- `_linePts` 追加 + drawArrow/line/hit/bbox/SVG/minimap/label/transform の
  各経路に way 分岐。way 未設定の既存図形は `[p1,p2]` で見た目同一。
