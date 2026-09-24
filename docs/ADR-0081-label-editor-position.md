# ADR-0081: ラベル編集オーバレイの正位置化 (diamond + routed connector)

## 状態

実装済み (v1.7.139)。

## 背景

`_openLabelEditorFor` は ADR-0061 (diamond)・ADR-0062 (elbow)・
ADR-0068 (curve)・ADR-0076 (waypoint) の追加に追随していない:

- **diamond** — `_drawBoxLabel`/`_svgBoxLabel` でラベルは描画されるのに、
  ダブルクリック/Enter で編集エディタが開かない (型ゲートから抜け)。
- **elbow/curve/waypoint コネクタ** — ラベルは `_elbowLabelXY`/
  `_curveLabelXY`/`s.way` に描画されるのに、編集オーバレイは常に
  直線中点 `(x1+x2)/2` に開き、表示位置と食い違う。

## 決定

- `_connLabelXY(s)` を新設 — `_drawConnLabel` の位置計算
  (elbow→trunk中点、curve→制御点、way→waypoint、直線→中点) を
  単一化し、canvas 描画とラベルエディタの両方が参照。
- `_openLabelEditorFor` の box 型ゲートに `diamond` を追加、
  connector 分岐は `_connLabelXY` に置き換え。

## 断念した代替案

- **SVG 側も `_connLabelXY` にリファクタ**: `_connLabelSVG` の引数は
  (x1,y1,x2,y2) を中点計算に流用しており、署名変更は呼び出し4箇所に
  波及する。描画位置は既に正しいので、今回は canvas+editor の統一に留める。

## 影響

- 動作変更: diamond ラベルが dblclick/Enter で編集可能に、
  routed/waypoint connector の編集オーバレイがラベル描画位置に開く。
- `_drawConnLabel` の位置計算を `_connLabelXY` へ移動 — 描画結果は不変。
