# ADR-0220: .drawio エクスポート

## 状態

実装済み (v1.7.278)。

## 背景

ADR-0203 で draw.io の非圧縮 mxGraphModel のインポートを
実装したが、往復 (export) が無く Board→draw.io の一方向
移行ができなかった。フローチャート作成で draw.io との
相互運用は頻出要件 (海外情報源: drawio opensource の
mxGraphModel 仕様)。

## 決定

`boardToDrawio(shapes)` で非圧縮 mxGraphModel XML を生成し、
エクスポートメニューに「drawio (.drawio) 書き出し」を追加:

- vertex: rect(rounded)/ellipse/rhombus(diamond)/text/
  note(sticky)/swimlane(frame)。label/text は `value`、
  改行は `&lt;br&gt;` にエスケープ
- edge: line/arrow。bound 端点は `source`/`target` 参照、
  自由端は `sourcePoint`/`targetPoint`、waypoints は
  `Array as="points"`、elbow は `edgeStyle=orthogonalEdgeStyle`、
  curve→`curved=1`、hop→`jumpStyle=arc`
- 共有スタイル語彙: fillColor/strokeColor/strokeWidth/
  dashed/opacity/fontSize/rounded
- pen は drawio 相当型が無く skip、非表示図形も除外
  (ADR 本文に明記)

## 断念した代替案

- **圧縮ペイロード (deflate+base64) で出力**: 依存ゼロの
  制約上 deflate が書けず、非圧縮は draw.io がそのまま
  開ける公式形式。非圧縮で十分。
- **pen の freeform 近似 (mxgraph ストリーム)**: 独自形式の
  再現は誤差が大きい — skip を明記して誤沈黙を避けた。

## 影響

- 書き出しのみ。`visible===0`・`pen` の除外は import 側の
  仕様 (ADR-0203 と同じトレードオフ)。
