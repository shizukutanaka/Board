# ADR-0062: エルボー (直角) コネクタ

## 状態

採用 (v1.7.120)

## 背景

Board のコネクタ (line/arrow) は常に直線 — 結合時は両端が対象図形のエッジに
投影される。フローチャート用途では「直角に折れ曲がるコネクタ」(elbow /
orthogonal routing) が標準: Excalidraw は 2024-12 に elbow arrow を実装、
draw.io/FigJam でも既定ルーティング。ADR-0061 の diamond (判定ノード) と
組み合わせた時、直線だけでは実用的なフローチャートが描けない。

## 決定

`s.elbow` (truthy で有効、`0`/未定義 = 直線 — `dash:0` と同じ規約) を
line/arrow に追加する**形状ごとのトグル**。経路は `_elbowPts(s)` が生成:

- 両端点は従来どおり `connEnds` (エッジ投影) を使う。
- 結合端は「外向き法線」方向にスタブを伸ばす — 中心→端点の支配軸を法線と
  し、`STUB=max(16, size*8)` だけ外側へ。
- 非結合端は支配軸方向 (dx≥dy → 水平) にスタブ、もう一方は逆方向。
- 2つのスタブ先端 (q1,q2) を中間点 `mid` で直交結合:
  `d1.x!==0 → mid={x:q2.x,y:q1.y}`。`mid` が q1/q2 と一致する退化時は省略
  し L 字または直線に落ちる。
- 描画は polyline、arrow のヘッドは**最終セグメントの方向**で描く
  (結合端は常に形状に垂直に刺さる)。
- `G.hit` は折れ線の全セグメントに distToSeg。`_drawConnLabel`/SVG ラベルは
  スタブ先端 q1..q2 の中点に配置。
- SVG 出力は `<polyline>` + ヘッド `<polygon>` (最終セグメント角度)。
  ミニマップも折れ線。
- コンテキストメニューに `ctxElbow` を追加 — 選択中の line/arrow を
  個別トグルし `style` op (before/after に `elbow`) で記録 →
  undo/同期/property-LWW が既存経路で効く。

## 断念した代替案

- **フルルーティングエンジン** (障害物回避): Excalidraw の elbowed は
  グリッド探索で他図形を回避する。scratchpad には過剰で、線がシェイプを
  横切るケースは人がドラッグで直す。スタブ+中間点の決定的経路で十分。
- **接続点 (ポート) の方位選択**: ユーザーが辺を選ぶ方式は UI が重い。
  法線自動推定で大半のケースをカバー。
- **新 shape 型 `elbow`**: `line.type==='arrow'` ではなく prop トグルにした
  理由と同じ — 既存コネクタの性質 (binding/label/dash/hit 部分) を
  そのまま継承できる。
- **ツールレベルの elbow モード**: パレットの切替より「あとから直角化」
  の方が実用頻度が高い (draw.io もセグメント単位)。描画時に Shift+クリック
  等は将来の拡張。

## 影響

- 選択した line/arrow をコンテキストメニュー「エルボー (直角)」で
  折れ線コネクタ化 / 解除。undo・wclock 同期・style コピーの対象に
  ならない (styleClipboard に elbow は含めない — コネクタ専用 prop のため)。
- 旧版 Board で開くと `elbow` は無視され直線表示に退化 (graceful)。
- フローチャート (rect+diamond+elbow arrow) が Board 内で完結する。
