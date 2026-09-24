# ADR-0178: フレーム/画像ボーダーの破線

## 状態

実装済み (v1.7.236)。

## 背景

`s.dash` の描画は rect/ellipse/diamond/line/arrow に限定 — dash ボタン
は全選択に届くが frame 枠・画像ボーダー (ADR-0176) には効かなかっ
た。draw.io では破線フレームが仮グループの表現として定番。

## 決定

per-shape の dash ゲートに `'frame'||'image'` を追加し、frame 枠・
画像ボーダーが `dashArr(s.dash,s.size)` を描画 (canvas + SVG の
`stroke-dasharray`)。画像ボーダー描画後は `setLineDash([])` を戻し、
キャプションの文字装飾線が破線にならないようにする。

## 断念した代替案

- **dash を frame に適用しない**: style 体系の一貫性が壊れる。

## 影響

- `s.dash` 未設定では不変。SVG 書き出しも一致。
