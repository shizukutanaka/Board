# ADR-0354: .drawio emit — ペンストロークを polyline edge で出力

## 状態
承認 — round82

## 背景
drawio emit は vertex (shape) と edge (line/arrow) のみで、`pen` は
どちらのループにも入らず **書き出しで完全に消失**していた。

## 決定
- `s.pts` を `endArrow=none` の polyline edge として emit:
  先頭/末尾を source/targetPoint、中間点を `<Array as="points">`。
  `rounded=1` + `_dioStyEmit` で色・線幅・opacity を維持。
  group parent (ADR-0347) と link/visible も edge と同じ規則。
- import 側は既存 edge パスで `line`+`s.way` として復元 —
  画素は保存され意味のみ pen→line に変化 (受理、ADR-0349 と同じ
  トレードオフ)。

## 影響
+~1.1KB。手書きインクが Board→drawio で保存されるようになった。
2044 全緑。
