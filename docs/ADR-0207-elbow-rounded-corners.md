# ADR-0207: エルボーコネクタの角丸

## 状態

実装済み (v1.7.265)。

## 背景

draw.io の `rounded=1` edgeStyle に相当 — Board のエルボー経路は
常に直角ジョイントで、見た目が硬いフローチャートになっていた。
`s.r` はボックス図形専用プロパティだった。

## 決定

`s.r` を elbow コネクタにも流用: `_polylineR`/`_polylineRd`
(canvas/SVG 対称) で内側ジョイントを r だけ両側トリムし
quadratic 曲線で橋渡し (_diamondPath と同一数学、r はセグメント
半長でクランプ)。`cycleCorner`/`ctxCorner` ゲートに
`(line|arrow)&&s.elbow` を追加 — 既存 8→16→24→0px シーケンスで
巡回。未設定 (r=null) は従来のシャープ経路。

## 断念した代替案

- **edgeStyle=rounded 相当の独立フラグ**: `s.r` 流用で値の粒度も
  既存 UI も再利用できるため不要。

## 影響

- elbow コネクタの ctx「角丸を切替」で角丸化。矢印ヘッドは最終
  セグメント方向を見るため切込み部分の向き変化は無害。
