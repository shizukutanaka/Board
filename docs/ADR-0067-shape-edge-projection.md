# ADR-0067: コネクタ結合点のシェイプ別エッジ投影

## 状態

採用 (v1.7.125)

## 背景

`connEnds` の結合端点は `_edgePt` が「中心→もう一端方向」のレイを
**bbox 辺**に投影して求める。rect/sticky/frame では正しいが、
ADR-0061 の diamond では bbox 角 = 図形の輪郭が無い位置に矢が刺さり、
ellipse でも斜め方向で実輪郭との隙間が視認できる。

- diamond: `|dx|/rx + |dy|/ry = 1` が真の輪郭 → `k = 1/(|dx|/rx + |dy|/ry)`
  (bbox 角ではなく斜辺上に着地)。
- ellipse: `(dx/rx)² + (dy/ry)² = 1` → `k = 1/hypot(dx/rx, dy/ry)`。

## 決定

`_edgePt` 内で `sh.type` が `diamond`/`ellipse` の場合に解析的な
コンター式で k を求める (回転は既存の un-rotate → 再 rotate で無関係)。
それ以外の型は従来どおり bbox 辺 — pen の輪郭は不定、text/sticky は
実質矩形なので投影対象外。

## 断念した代替案

- **全型を輪郭投影**: pen/sticky は輪郭が不定または矩形 — 無意味。
- **diamond を頂点スナップ**: 4頂点への吸着は draw.io の port 相当だが、
  連続エッジ投影のほうが見た目が自然。
- **excalidraw 式の polygon 近似**: 解析式が1行で済むので不要。

## 影響

- diamond/ellipse に結ぶ arrow/line (直線・elbow 両方、`connEnds` 経路
  すべて — draw/hit/SVG/ラベル) が真の輪郭に着地。
- 図形モデル・op 不変 — 描画導出のみの変更。
